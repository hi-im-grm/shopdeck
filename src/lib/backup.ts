/**
 * Full database snapshot & restore.
 *
 * Why JSON dump instead of raw .db copy?
 *  - SQLite file is locked while app runs — we'd need plugin-fs + restart.
 *  - JSON works through @tauri-apps/plugin-sql we already have.
 *  - Preserves IDs so foreign keys (todos.customer_id, notes.product_id,
 *    interactions.customer_id, product_price_history.product_id) stay valid.
 *
 * Format is forward-compatible: future schemas just add new tables under
 * `tables` and bump `schemaVersion`. Restores from older snapshots still work.
 */
import { db } from "./db";

/** Bumped only if the JSON file shape changes (not for schema additions). */
const BACKUP_VERSION = 1;
/** Current app schema version — matches Tauri migrations 001 → 003. */
const SCHEMA_VERSION = 3;

/**
 * Tables in dependency order (parents → children). On import we INSERT in
 * this order so FK references resolve. On wipe we go reverse.
 *
 * If you add a new table in a migration, append it here and (probably) bump
 * SCHEMA_VERSION.
 */
const TABLES = [
  "customers",
  "products",
  "interactions",
  "todos",
  "notes",
  "product_price_history",
  "offer_templates",
] as const;

type TableName = (typeof TABLES)[number];

export type BackupFile = {
  /** App identifier — sanity check on import. */
  app: "shopdeck";
  version: number;
  schemaVersion: number;
  /** ISO-8601 timestamp generated at export time. */
  exportedAt: string;
  tables: Record<string, Array<Record<string, unknown>>>;
};

export type ImportSummary = {
  inserted: Record<string, number>;
  skippedTables: string[];
};

/** Dump every tracked table to a JSON object. Returns the in-memory file. */
export async function exportBackup(): Promise<BackupFile> {
  const conn = await db();
  const tables: Record<string, Array<Record<string, unknown>>> = {};
  for (const t of TABLES) {
    tables[t] = await conn.select<Array<Record<string, unknown>>>(
      `SELECT * FROM ${t}`,
    );
  }
  return {
    app: "shopdeck",
    version: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

/**
 * Trigger a download of the backup as a single JSON file.
 * Works inside the Tauri webview just like in a browser.
 */
export async function downloadBackup(): Promise<{
  filename: string;
  totalRows: number;
}> {
  const backup = await exportBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `shopdeck-backup-${stamp}.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const totalRows = Object.values(backup.tables).reduce(
    (n, rows) => n + rows.length,
    0,
  );
  return { filename, totalRows };
}

/**
 * Validate then replace all data with the contents of a backup file.
 * Throws on:
 *  - wrong app identifier
 *  - unsupported version
 *  - schema NEWER than this build understands
 *
 * Imports older schemas: silently skips tables that don't exist in this build.
 */
export async function importBackup(backup: unknown): Promise<ImportSummary> {
  const validated = validateBackup(backup);
  const conn = await db();

  // Wipe in reverse dependency order so any cascades/triggers behave.
  // We can't BEGIN/COMMIT through plugin-sql easily, so we accept that a
  // mid-import crash leaves a partially-empty DB — same risk as any restore.
  for (const t of [...TABLES].reverse()) {
    await conn.execute(`DELETE FROM ${t}`);
  }

  const inserted: Record<string, number> = {};
  const skippedTables: string[] = [];

  for (const t of TABLES) {
    const rows = validated.tables[t];
    if (!Array.isArray(rows)) {
      // Older backup that didn't have this table — leave it empty.
      inserted[t] = 0;
      continue;
    }
    let count = 0;
    for (const row of rows) {
      const keys = Object.keys(row).filter((k) => k !== undefined);
      if (keys.length === 0) continue;
      const placeholders = keys.map(() => "?").join(",");
      const values = keys.map((k) => normalizeValue(row[k]));
      await conn.execute(
        `INSERT INTO ${t} (${keys.map(quoteIdent).join(",")}) VALUES (${placeholders})`,
        values,
      );
      count++;
    }
    inserted[t] = count;
  }

  // Note any extra tables in the backup we don't know about (forward-compat).
  for (const t of Object.keys(validated.tables)) {
    if (!(TABLES as readonly string[]).includes(t)) {
      skippedTables.push(t);
    }
  }

  return { inserted, skippedTables };
}

/** Parse a File (from <input type="file">) as a BackupFile. */
export async function readBackupFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

// ---- helpers ----

function validateBackup(raw: unknown): BackupFile {
  if (!raw || typeof raw !== "object") {
    throw new Error("Plik nie jest prawidłowym backupem (brak struktury).");
  }
  const r = raw as Partial<BackupFile>;
  if (r.app !== "shopdeck") {
    throw new Error("Plik nie pochodzi z shopdeck.");
  }
  if (typeof r.version !== "number" || r.version > BACKUP_VERSION) {
    throw new Error(
      `Nieobsługiwana wersja pliku backupu (${r.version}). Zaktualizuj aplikację.`,
    );
  }
  if (typeof r.schemaVersion !== "number") {
    throw new Error("Backup nie zawiera wersji schematu.");
  }
  if (r.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `Backup pochodzi z nowszej wersji aplikacji (schema ${r.schemaVersion} > ${SCHEMA_VERSION}). ` +
        `Zaktualizuj aplikację najpierw.`,
    );
  }
  if (!r.tables || typeof r.tables !== "object") {
    throw new Error("Backup nie zawiera danych tabel.");
  }
  return r as BackupFile;
}

/** SQLite parameter binding accepts string/number/null/Uint8Array — coerce. */
function normalizeValue(v: unknown): string | number | null {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  // JSON-stringify objects/arrays — they're already represented as TEXT columns
  // in our schema (e.g. attributes_json, tags_json, items_json).
  return JSON.stringify(v);
}

/** Quote a column/table identifier defensively. */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Useful for the confirm dialog — describes what's about to be wiped. */
export async function getCurrentRowCounts(): Promise<Record<TableName, number>> {
  const conn = await db();
  const out = {} as Record<TableName, number>;
  for (const t of TABLES) {
    const [r] = await conn.select<{ n: number }[]>(
      `SELECT COUNT(*) as n FROM ${t}`,
    );
    out[t] = r?.n ?? 0;
  }
  return out;
}

export const TABLE_LABELS_PL: Record<TableName, string> = {
  customers: "klienci",
  products: "produkty",
  interactions: "interakcje",
  todos: "zadania",
  notes: "notatki",
  product_price_history: "historia cen",
  offer_templates: "szablony ofert",
};

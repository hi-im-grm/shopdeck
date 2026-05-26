/**
 * Audit log helpers for tracked entities (customers, products).
 *
 * Pattern at call sites:
 *   const before = await fetchCurrent(id);   // null on create
 *   await db.execute('UPDATE …');
 *   const after = await fetchCurrent(id);
 *   await logChange('customer', id, before, after);
 *
 * For deletes:
 *   const snapshot = await fetchCurrent(id);
 *   await db.execute('DELETE …');
 *   await logDelete('customer', id, snapshot);
 */
import { db } from "./db";

export type AuditEntityType = "customer" | "product";

export type AuditAction = "create" | "update" | "delete";

export type AuditEntry = {
  id: number;
  entity_type: AuditEntityType;
  entity_id: number;
  action: AuditAction;
  /** JSON: { field: { old, new } } — present for create+update */
  changed_fields: string | null;
  /** JSON: full row at deletion time — present for delete only */
  snapshot_json: string | null;
  changed_at: number;
};

/** Fields we don't care about in diffs — noisy, derived, or sync-only. */
const IGNORE_FIELDS = new Set(["created_at", "updated_at"]);

/** Compute a field-level diff between two row snapshots. */
function diff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Record<string, { old: unknown; new: unknown }> {
  const out: Record<string, { old: unknown; new: unknown }> = {};
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  for (const k of keys) {
    if (IGNORE_FIELDS.has(k)) continue;
    const o = before?.[k] ?? null;
    const n = after?.[k] ?? null;
    if (!shallowEqual(o, n)) out[k] = { old: o, new: n };
  }
  return out;
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Log a create or update. If `before` is null we record as a "create".
 * No-op if there's no actual field change (avoids spamming the log when
 * users open and re-save without editing anything).
 */
export async function logChange(
  entity_type: AuditEntityType,
  entity_id: number,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Promise<void> {
  if (!after) return;
  const fieldDiff = diff(before, after);
  if (Object.keys(fieldDiff).length === 0 && before) {
    // Nothing actually changed — skip noisy log entry.
    return;
  }
  const conn = await db();
  await conn.execute(
    `INSERT INTO audit_log (entity_type, entity_id, action, changed_fields)
     VALUES (?, ?, ?, ?)`,
    [
      entity_type,
      entity_id,
      before ? "update" : "create",
      JSON.stringify(fieldDiff),
    ],
  );
}

/** Log a deletion — stores full row snapshot for display. */
export async function logDelete(
  entity_type: AuditEntityType,
  entity_id: number,
  snapshot: Record<string, unknown> | null,
): Promise<void> {
  if (!snapshot) return;
  const conn = await db();
  await conn.execute(
    `INSERT INTO audit_log (entity_type, entity_id, action, snapshot_json)
     VALUES (?, ?, ?, ?)`,
    [entity_type, entity_id, "delete", JSON.stringify(snapshot)],
  );
}

/** Fetch history for a single entity, newest first. */
export async function fetchAuditLog(
  entity_type: AuditEntityType,
  entity_id: number,
  limit = 100,
): Promise<AuditEntry[]> {
  const conn = await db();
  return conn.select<AuditEntry[]>(
    `SELECT * FROM audit_log
     WHERE entity_type = ? AND entity_id = ?
     ORDER BY changed_at DESC
     LIMIT ?`,
    [entity_type, entity_id, limit],
  );
}

/** Human-readable Polish labels for known column names — used by UI. */
export const FIELD_LABELS_PL: Record<string, string> = {
  name: "Nazwa",
  kind: "Typ klienta",
  company: "Firma",
  nip: "NIP",
  email: "Email",
  phone: "Telefon",
  address: "Adres",
  notes: "Notatki",
  tags_json: "Tagi",
  manufacturer: "Producent",
  model: "Model",
  sku: "SKU",
  type: "Typ napędu",
  price_cents: "Cena (grosze)",
  pros: "Zalety",
  cons: "Wady",
  description: "Opis",
  image_data_url: "Zdjęcie",
  attributes_json: "Atrybuty",
  external_links_json: "Linki zewnętrzne",
  max_weight_kg: "Max. masa (kg)",
  max_length_m: "Max. długość (m)",
  power_w: "Moc (W)",
  voltage: "Zasilanie",
  duty_cycle: "Intensywność",
  ip_rating: "Klasa IP",
};

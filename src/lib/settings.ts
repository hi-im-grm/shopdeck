/**
 * Tiny key/value wrapper over the `app_settings` table.
 *
 * All values are stored as TEXT; helpers cast on the way in/out.
 */
import { db } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  const conn = await db();
  const rows = await conn.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = ?",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const conn = await db();
  await conn.execute(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()`,
    [key, value],
  );
}

export async function deleteSetting(key: string): Promise<void> {
  const conn = await db();
  await conn.execute("DELETE FROM app_settings WHERE key = ?", [key]);
}

export async function getNumberSetting(
  key: string,
  fallback: number,
): Promise<number> {
  const v = await getSetting(key);
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function setNumberSetting(key: string, value: number): Promise<void> {
  await setSetting(key, String(value));
}

/** Well-known setting keys — strings are stable, used by multiple modules. */
export const SETTINGS_KEYS = {
  PASSWORD_HASH: "auth.password_hash",
  PASSWORD_SALT: "auth.password_salt",
  BACKUP_FOLDER: "backup.folder",
  LAST_BACKUP_AT: "backup.last_at_unix",
  WRITES_SINCE_BACKUP: "backup.writes_since",
} as const;

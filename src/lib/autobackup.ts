/**
 * Auto-backup orchestration.
 *
 * Triggers a silent JSON dump to a user-chosen folder when:
 *   - a write counter crosses a threshold (default 50 writes), or
 *   - the last successful backup is older than 24h and the user opens the app.
 *
 * The folder picker uses tauri-plugin-dialog; writes use tauri-plugin-fs.
 * In the unlikely case those plugins aren't available (e.g. pure browser dev),
 * write functions throw and we surface a toast to the user.
 */
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { exportBackup } from "./backup";
import {
  getSetting,
  setSetting,
  getNumberSetting,
  setNumberSetting,
  SETTINGS_KEYS,
} from "./settings";

const WRITES_THRESHOLD = 50;
const DAILY_THRESHOLD_SECONDS = 24 * 60 * 60;

export type BackupStatus = {
  folder: string | null;
  lastBackupAt: number | null;
  writesSinceBackup: number;
};

export async function getBackupStatus(): Promise<BackupStatus> {
  return {
    folder: await getSetting(SETTINGS_KEYS.BACKUP_FOLDER),
    lastBackupAt: (await getNumberSetting(SETTINGS_KEYS.LAST_BACKUP_AT, 0)) || null,
    writesSinceBackup: await getNumberSetting(
      SETTINGS_KEYS.WRITES_SINCE_BACKUP,
      0,
    ),
  };
}

/** Show OS folder picker and persist the result. */
export async function pickBackupFolder(): Promise<string | null> {
  const selected = await openDialog({
    directory: true,
    multiple: false,
    title: "Wybierz folder na auto-backupy shopdeck",
  });
  if (!selected || Array.isArray(selected)) return null;
  await setSetting(SETTINGS_KEYS.BACKUP_FOLDER, selected);
  return selected;
}

export async function clearBackupFolder(): Promise<void> {
  await setSetting(SETTINGS_KEYS.BACKUP_FOLDER, "");
}

/**
 * Write a full backup JSON to the configured folder.
 * Throws on missing folder or filesystem errors.
 */
export async function writeBackupToFolder(opts?: { silent?: boolean }): Promise<{
  path: string;
  totalRows: number;
}> {
  const folder = await getSetting(SETTINGS_KEYS.BACKUP_FOLDER);
  if (!folder) {
    throw new Error("Folder backupu nie jest ustawiony. Wybierz go najpierw.");
  }

  // Ensure folder exists (user might have removed it).
  if (!(await exists(folder))) {
    await mkdir(folder, { recursive: true });
  }

  const backup = await exportBackup();
  const json = JSON.stringify(backup, null, 2);
  // Filename format: shopdeck-backup-YYYY-MM-DD-HHMMSS.json
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const sep = folder.includes("\\") ? "\\" : "/";
  const path = `${folder.replace(/[\\/]$/, "")}${sep}shopdeck-backup-${stamp}.json`;

  await writeTextFile(path, json);

  // Reset counters
  await setNumberSetting(
    SETTINGS_KEYS.LAST_BACKUP_AT,
    Math.floor(Date.now() / 1000),
  );
  await setNumberSetting(SETTINGS_KEYS.WRITES_SINCE_BACKUP, 0);

  const totalRows = Object.values(backup.tables).reduce(
    (n, rows) => n + rows.length,
    0,
  );

  // Silent mode for auto-runs; caller decides whether to toast.
  if (!opts?.silent) {
    // no-op
  }

  return { path, totalRows };
}

/**
 * Called from every write-handler after a successful save/delete.
 * Increments the counter and triggers a silent backup if threshold reached.
 *
 * Failures are swallowed (logged to console) so a missing folder never blocks
 * the user's actual save flow.
 */
export async function recordWriteForBackup(): Promise<void> {
  try {
    const folder = await getSetting(SETTINGS_KEYS.BACKUP_FOLDER);
    if (!folder) return; // not configured yet — nothing to do

    const count = (await getNumberSetting(SETTINGS_KEYS.WRITES_SINCE_BACKUP, 0)) + 1;
    await setNumberSetting(SETTINGS_KEYS.WRITES_SINCE_BACKUP, count);

    if (count >= WRITES_THRESHOLD) {
      await writeBackupToFolder({ silent: true });
    }
  } catch (e) {
    console.warn("auto-backup write check failed:", e);
  }
}

/**
 * Called on app start (Dashboard mount). Runs a silent backup if the last one
 * was more than 24h ago.
 */
export async function runDailyBackupIfNeeded(): Promise<{
  ran: boolean;
  reason?: string;
}> {
  try {
    const folder = await getSetting(SETTINGS_KEYS.BACKUP_FOLDER);
    if (!folder) return { ran: false, reason: "Folder backupu nie ustawiony" };
    const last = await getNumberSetting(SETTINGS_KEYS.LAST_BACKUP_AT, 0);
    const now = Math.floor(Date.now() / 1000);
    if (now - last < DAILY_THRESHOLD_SECONDS) {
      return { ran: false, reason: "Backup zrobiony mniej niż 24h temu" };
    }
    await writeBackupToFolder({ silent: true });
    return { ran: true };
  } catch (e) {
    console.warn("daily backup failed:", e);
    return { ran: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Human-readable "X minut/godzin/dni temu" from a unix timestamp. */
export function formatRelative(ts: number | null): string {
  if (!ts) return "nigdy";
  const diffSec = Math.floor(Date.now() / 1000) - ts;
  if (diffSec < 60) return "przed chwilą";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min temu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} godz. temu`;
  const days = Math.floor(diffSec / 86400);
  if (days < 7) return `${days} ${days === 1 ? "dzień" : "dni"} temu`;
  return new Date(ts * 1000).toLocaleDateString("pl-PL");
}

-- Settings store (key/value) — used for: password hash/salt, backup folder,
-- last_backup_at timestamp, writes_since_backup counter, and anything else
-- that doesn't deserve its own table.
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Audit log: every create/update/delete on tracked entities lands here.
-- changed_fields JSON shape: { fieldName: { old: any, new: any } }
-- snapshot_json: full row JSON, used for "delete" entries so we can render
-- what was removed without joining anywhere.
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changed_fields TEXT,
  snapshot_json TEXT,
  changed_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_log(entity_type, entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_recent
  ON audit_log(changed_at DESC);

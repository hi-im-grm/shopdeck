-- Customer tags (VIP, hurt, zaległy itp.) — JSON array of strings.
ALTER TABLE customers ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';

-- Product price change log — appended on every save() that mutates price_cents.
CREATE TABLE IF NOT EXISTS product_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price_cents INTEGER NOT NULL,
  new_price_cents INTEGER NOT NULL,
  changed_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_price_history_product
  ON product_price_history(product_id, changed_at DESC);

-- Offer templates — predefined product bundles
-- items_json shape: [{ product_id: number, qty: number, note: string | null }]
CREATE TABLE IF NOT EXISTS offer_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  items_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

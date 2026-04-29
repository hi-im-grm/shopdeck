ALTER TABLE notes ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;

UPDATE notes SET customer_id = linked_entity_id WHERE linked_entity_type = 'customer';
UPDATE notes SET product_id = linked_entity_id WHERE linked_entity_type = 'product';

CREATE INDEX IF NOT EXISTS idx_notes_customer ON notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_notes_product ON notes(product_id);

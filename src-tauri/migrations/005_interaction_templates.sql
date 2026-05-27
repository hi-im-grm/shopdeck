-- Predefined templates for common interactions ("Pytanie o serwis",
-- "Wycena", "Reklamacja", ...). User picks from dropdown when adding an
-- interaction; values prefill the form. use_count tracks popularity so we
-- can sort favorites first.
CREATE TABLE IF NOT EXISTS interaction_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'call',
  summary_template TEXT NOT NULL,
  body_template TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_interaction_templates_use
  ON interaction_templates(use_count DESC);

-- Seed common templates — user can edit/delete or add own.
INSERT INTO interaction_templates (name, kind, summary_template, body_template) VALUES
  ('Pytanie o numer serwisu', 'call', 'Pytanie o numer serwisu / kontakt do serwisanta', NULL),
  ('Pytanie o cenę', 'call', 'Pytanie o cenę napędu', NULL),
  ('Zapytanie ofertowe', 'call', 'Zapytanie ofertowe — do wyceny', '## Parametry bramy:\n- Wymiary:\n- Waga skrzydła:\n- Typ bramy:\n\n## Pytania klienta:\n-'),
  ('Reklamacja', 'call', 'Reklamacja produktu', '## Co się stało:\n\n## Numer faktury / data zakupu:\n\n## Oczekiwania klienta:\n'),
  ('Umówienie montażu', 'call', 'Umówienie terminu montażu', '## Termin:\n## Adres montażu:\n## Co montujemy:\n## Dodatkowe ustalenia:\n'),
  ('Pytanie o dostępność', 'call', 'Pytanie o dostępność produktu', NULL),
  ('Follow-up po wycenie', 'call', 'Follow-up — sprawdzić decyzję po wysłanej wycenie', NULL);

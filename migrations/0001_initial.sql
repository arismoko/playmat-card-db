PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
  oracle_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  search_name TEXT NOT NULL,
  layout TEXT NOT NULL,
  mana_cost TEXT NOT NULL DEFAULT '',
  mana_value REAL NOT NULL DEFAULT 0,
  type_line TEXT NOT NULL DEFAULT '',
  oracle_text TEXT NOT NULL DEFAULT '',
  colors_json TEXT NOT NULL DEFAULT '[]',
  color_identity_json TEXT NOT NULL DEFAULT '[]',
  keywords_json TEXT NOT NULL DEFAULT '[]',
  produced_mana_json TEXT NOT NULL DEFAULT '[]',
  defense TEXT,
  loyalty TEXT,
  power TEXT,
  toughness TEXT,
  is_token INTEGER NOT NULL DEFAULT 0,
  is_reserved INTEGER NOT NULL DEFAULT 0,
  cmc_sort REAL NOT NULL DEFAULT 0,
  scryfall_raw_json TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (json_valid(colors_json)),
  CHECK (json_valid(color_identity_json)),
  CHECK (json_valid(keywords_json)),
  CHECK (json_valid(produced_mana_json)),
  CHECK (json_valid(scryfall_raw_json)),
  CHECK (is_token IN (0, 1)),
  CHECK (is_reserved IN (0, 1))
);

CREATE TABLE IF NOT EXISTS card_faces (
  oracle_id TEXT NOT NULL,
  face_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  mana_cost TEXT NOT NULL DEFAULT '',
  type_line TEXT NOT NULL DEFAULT '',
  oracle_text TEXT NOT NULL DEFAULT '',
  flavor_text TEXT NOT NULL DEFAULT '',
  colors_json TEXT NOT NULL DEFAULT '[]',
  color_indicator_json TEXT NOT NULL DEFAULT '[]',
  power TEXT,
  toughness TEXT,
  loyalty TEXT,
  defense TEXT,
  watermark TEXT,
  artist TEXT,
  illustration_id TEXT,
  scryfall_raw_json TEXT NOT NULL,
  PRIMARY KEY (oracle_id, face_index),
  FOREIGN KEY (oracle_id) REFERENCES cards(oracle_id) ON DELETE CASCADE,
  CHECK (face_index >= 0),
  CHECK (json_valid(colors_json)),
  CHECK (json_valid(color_indicator_json)),
  CHECK (json_valid(scryfall_raw_json))
);

CREATE TABLE IF NOT EXISTS printings (
  scryfall_id TEXT PRIMARY KEY,
  oracle_id TEXT,
  name TEXT NOT NULL,
  search_name TEXT NOT NULL,
  lang TEXT NOT NULL,
  released_at TEXT,
  uri TEXT,
  scryfall_uri TEXT,
  rulings_uri TEXT,
  prints_search_uri TEXT,
  layout TEXT NOT NULL,
  mana_cost TEXT NOT NULL DEFAULT '',
  mana_value REAL NOT NULL DEFAULT 0,
  type_line TEXT NOT NULL DEFAULT '',
  oracle_text TEXT NOT NULL DEFAULT '',
  colors_json TEXT NOT NULL DEFAULT '[]',
  color_identity_json TEXT NOT NULL DEFAULT '[]',
  keywords_json TEXT NOT NULL DEFAULT '[]',
  produced_mana_json TEXT NOT NULL DEFAULT '[]',
  set_id TEXT,
  set_code TEXT,
  set_name TEXT,
  set_type TEXT,
  collector_number TEXT,
  rarity TEXT,
  flavor_name TEXT,
  artist TEXT,
  artist_ids_json TEXT NOT NULL DEFAULT '[]',
  illustration_id TEXT,
  games_json TEXT NOT NULL DEFAULT '[]',
  finishes_json TEXT NOT NULL DEFAULT '[]',
  promo_types_json TEXT NOT NULL DEFAULT '[]',
  frame_effects_json TEXT NOT NULL DEFAULT '[]',
  prices_json TEXT NOT NULL DEFAULT '{}',
  purchase_uris_json TEXT NOT NULL DEFAULT '{}',
  related_uris_json TEXT NOT NULL DEFAULT '{}',
  is_token INTEGER NOT NULL DEFAULT 0,
  is_digital INTEGER NOT NULL DEFAULT 0,
  is_rebalanced INTEGER NOT NULL DEFAULT 0,
  is_reserved INTEGER NOT NULL DEFAULT 0,
  is_reprint INTEGER NOT NULL DEFAULT 0,
  is_variation INTEGER NOT NULL DEFAULT 0,
  is_promo INTEGER NOT NULL DEFAULT 0,
  is_full_art INTEGER NOT NULL DEFAULT 0,
  is_textless INTEGER NOT NULL DEFAULT 0,
  is_oversized INTEGER NOT NULL DEFAULT 0,
  edhrec_rank INTEGER,
  scryfall_raw_json TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (oracle_id) REFERENCES cards(oracle_id) ON DELETE SET NULL,
  CHECK (json_valid(colors_json)),
  CHECK (json_valid(color_identity_json)),
  CHECK (json_valid(keywords_json)),
  CHECK (json_valid(produced_mana_json)),
  CHECK (json_valid(artist_ids_json)),
  CHECK (json_valid(games_json)),
  CHECK (json_valid(finishes_json)),
  CHECK (json_valid(promo_types_json)),
  CHECK (json_valid(frame_effects_json)),
  CHECK (json_valid(prices_json)),
  CHECK (json_valid(purchase_uris_json)),
  CHECK (json_valid(related_uris_json)),
  CHECK (json_valid(scryfall_raw_json)),
  CHECK (is_token IN (0, 1)),
  CHECK (is_digital IN (0, 1)),
  CHECK (is_rebalanced IN (0, 1)),
  CHECK (is_reserved IN (0, 1)),
  CHECK (is_reprint IN (0, 1)),
  CHECK (is_variation IN (0, 1)),
  CHECK (is_promo IN (0, 1)),
  CHECK (is_full_art IN (0, 1)),
  CHECK (is_textless IN (0, 1)),
  CHECK (is_oversized IN (0, 1))
);

CREATE TABLE IF NOT EXISTS printing_faces (
  scryfall_id TEXT NOT NULL,
  face_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  mana_cost TEXT NOT NULL DEFAULT '',
  type_line TEXT NOT NULL DEFAULT '',
  oracle_text TEXT NOT NULL DEFAULT '',
  flavor_text TEXT NOT NULL DEFAULT '',
  colors_json TEXT NOT NULL DEFAULT '[]',
  color_indicator_json TEXT NOT NULL DEFAULT '[]',
  power TEXT,
  toughness TEXT,
  loyalty TEXT,
  defense TEXT,
  artist TEXT,
  artist_ids_json TEXT NOT NULL DEFAULT '[]',
  illustration_id TEXT,
  image_small_url TEXT,
  image_normal_url TEXT,
  image_large_url TEXT,
  image_png_url TEXT,
  image_art_crop_url TEXT,
  image_border_crop_url TEXT,
  scryfall_raw_json TEXT NOT NULL,
  PRIMARY KEY (scryfall_id, face_index),
  FOREIGN KEY (scryfall_id) REFERENCES printings(scryfall_id) ON DELETE CASCADE,
  CHECK (face_index >= 0),
  CHECK (json_valid(colors_json)),
  CHECK (json_valid(color_indicator_json)),
  CHECK (json_valid(artist_ids_json)),
  CHECK (json_valid(scryfall_raw_json))
);

CREATE TABLE IF NOT EXISTS card_relations (
  source_scryfall_id TEXT NOT NULL,
  source_oracle_id TEXT,
  related_scryfall_id TEXT,
  related_name TEXT NOT NULL,
  related_type_line TEXT,
  component TEXT NOT NULL,
  uri TEXT,
  scryfall_raw_json TEXT NOT NULL,
  PRIMARY KEY (source_scryfall_id, related_name, component),
  FOREIGN KEY (source_scryfall_id) REFERENCES printings(scryfall_id) ON DELETE CASCADE,
  FOREIGN KEY (source_oracle_id) REFERENCES cards(oracle_id) ON DELETE SET NULL,
  FOREIGN KEY (related_scryfall_id) REFERENCES printings(scryfall_id) ON DELETE SET NULL,
  CHECK (json_valid(scryfall_raw_json))
);

CREATE TABLE IF NOT EXISTS legalities (
  scryfall_id TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (scryfall_id, format),
  FOREIGN KEY (scryfall_id) REFERENCES printings(scryfall_id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS card_search USING fts5(
  oracle_id UNINDEXED,
  name,
  face_names,
  type_lines,
  oracle_text
);

CREATE INDEX IF NOT EXISTS idx_cards_search_name ON cards(search_name);
CREATE INDEX IF NOT EXISTS idx_cards_layout ON cards(layout);
CREATE INDEX IF NOT EXISTS idx_cards_mana_value ON cards(mana_value);

CREATE INDEX IF NOT EXISTS idx_card_faces_name ON card_faces(name);

CREATE INDEX IF NOT EXISTS idx_printings_oracle_id ON printings(oracle_id);
CREATE INDEX IF NOT EXISTS idx_printings_search_name ON printings(search_name);
CREATE INDEX IF NOT EXISTS idx_printings_set_code ON printings(set_code);
CREATE INDEX IF NOT EXISTS idx_printings_released_at ON printings(released_at);
CREATE INDEX IF NOT EXISTS idx_printings_rarity ON printings(rarity);

CREATE INDEX IF NOT EXISTS idx_card_relations_source_oracle_id ON card_relations(source_oracle_id);
CREATE INDEX IF NOT EXISTS idx_card_relations_related_scryfall_id ON card_relations(related_scryfall_id);

CREATE INDEX IF NOT EXISTS idx_legalities_format_status ON legalities(format, status);

# Database schema

This database is designed to be the long-lived card store for Playmat.

Principles:

- keep full parity with Scryfall card data except image binaries
- keep queryable data in normal tables
- keep the original Scryfall payload in `scryfall_raw_json` for future-proofing
- separate oracle-level card identity from printing-level card identity

## Identity model

- `oracle_id`: the canonical gameplay card identity
- `scryfall_id`: a concrete printing identity
- `face_index`: deterministic face ordering for split, transform, adventure, battle, and flip cards

## Tables

### `sync_state`

Small key/value table for import metadata.

Use it for values like:

- last bulk data type
- last download URI
- last Scryfall updated timestamp
- last successful import time

### `cards`

One row per oracle card.

Stores the stable gameplay identity and top-level queryable fields:

- name and search name
- layout
- mana cost and mana value
- type line and oracle text
- colors, color identity, keywords, produced mana
- top-level stats when present
- token and reserved flags
- full upstream JSON snapshot

### `card_faces`

One row per oracle face.

Stores face-level gameplay data:

- face name
- mana cost
- type line
- oracle text
- flavor text
- power / toughness / loyalty / defense
- colors and color indicator
- watermark / artist / illustration ID when present
- raw upstream JSON snapshot

### `printings`

One row per concrete Scryfall card object.

Stores printing-specific data:

- language and release date
- set metadata
- rarity and collector number
- artist and illustration metadata
- games / finishes / promo types / frame effects
- purchase and related URLs
- prices JSON
- flags like digital, promo, reprint, variation, full art, textless, oversized
- full upstream JSON snapshot

### `printing_faces`

One row per printing face.

Stores the face-level printing payload and image URLs:

- face text fields
- stats
- artist fields
- all Scryfall image URLs as strings
- raw upstream JSON snapshot

Important: image binaries are not stored here, only URLs.

### `card_relations`

Stores relationships from Scryfall `all_parts`.

This is the foundation for:

- DFC / transform relationships
- meld relationships
- token and helper-card links
- other related-card features later

### `legalities`

One row per `(scryfall_id, format)` pair.

Legalities are normalized into rows instead of buried in JSON so format filters stay fast and readable.

### `card_search`

FTS table for card search.

The importer should populate it with aggregated oracle-level text:

- main card name
- combined face names
- combined type lines
- combined oracle text

## Why not raw JSON only?

Because raw JSON alone makes every feature turn into brittle JSON extraction logic.

This schema keeps:

- normalized tables for clean prepared queries
- raw JSON for parity and future-proofing

That gives the app a stable SQL model without throwing away any upstream data we might need later.

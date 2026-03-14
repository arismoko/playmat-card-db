# playmat-card-db

`playmat-card-db` is the card API boundary for Playmat.

It runs as a Cloudflare Worker, proxies Scryfall at runtime, normalizes the upstream payload into Playmat-owned card objects, and caches search and lookup responses at the edge. The point is to keep the browser and the app domain model decoupled from raw Scryfall responses.

## Why this exists

- Playmat should depend on a stable app-owned card shape, not a client-side Scryfall DTO.
- Cloudflare Worker caching keeps repeated card searches and lookups fast.
- The API boundary stays stable even if the backing implementation changes later.
- D1 can replace the runtime proxy without forcing client contract changes.

## Current architecture

1. Browser calls `playmat-card-db`
2. Worker requests Scryfall
3. Worker maps the response into Playmat `Card` objects
4. Worker caches the normalized response
5. Browser only sees the Playmat API contract

## Card model

The normalized shape currently includes:

- top-level card identity and layout
- mana cost, mana value, type line, oracle text
- colors, color identity, keywords, legalities
- set metadata and image URLs
- `faces[]` for multi-face cards
- `relatedCards[]` for linked cards from Scryfall `all_parts`

The runtime API schema lives in `src/card.ts`.

## Database plan

This repo now includes the final D1 schema in `migrations/0001_initial.sql`.

The database shape is intentionally designed so the team does not need to rethink it later:

- `cards` for oracle-level identity
- `card_faces` for gameplay face data
- `printings` for concrete Scryfall printings
- `printing_faces` for per-face image URLs and printing face metadata
- `card_relations` for `all_parts`
- `legalities` as normalized rows
- `sync_state` for import metadata
- `card_search` as the FTS surface

It stores full Scryfall payload snapshots in `scryfall_raw_json`, but keeps important fields normalized for prepared queries.

More detail lives in `docs/schema.md`.

## Routes

- `GET /`
- `GET /health`
- `GET /cards/search?q=lightning+bolt`
- `POST /cards/lookup`
- `GET /cards/by-name/Lightning%20Bolt`

### `GET /cards/search`

Searches Scryfall and returns up to 18 normalized cards.

Example:

```bash
curl "http://127.0.0.1:8787/cards/search?q=lightning%20bolt"
```

### `POST /cards/lookup`

Looks up cards by name with a batch request.

Example:

```bash
curl -X POST "http://127.0.0.1:8787/cards/lookup" \
  -H "content-type: application/json" \
  -d '{"names":["Delver of Secrets","Lightning Bolt"]}'
```

### `GET /cards/by-name/:name`

Looks up a single card by name.

Example:

```bash
curl "http://127.0.0.1:8787/cards/by-name/Delver%20of%20Secrets"
```

## Development

Install dependencies:

```bash
npm install
```

Start the local Worker:

```bash
npm run dev
```

Typecheck the project:

```bash
npm run check
```

## Deploy

Authenticate Wrangler if needed:

```bash
npx wrangler login
```

If you prefer token-based auth in your own shell, use `CLOUDFLARE_API_TOKEN` locally and keep it out of git.

Deploy the Worker:

```bash
npm run deploy
```

The Worker entrypoint and runtime config live in `wrangler.jsonc`.

## D1 setup

Create the database:

```bash
npx wrangler d1 create playmat-card-db
```

Take the returned `database_id` and fill in the commented `d1_databases` block in `wrangler.jsonc`.

Apply the initial schema:

```bash
npx wrangler d1 migrations apply playmat-card-db
```

Apply it locally during development:

```bash
npx wrangler d1 migrations apply playmat-card-db --local
```

The migration is intentionally the final base schema, not a throwaway starter schema.

## Notes

- There is no D1 runtime integration yet, so there are no SQL queries in the Worker yet.
- Once D1 is wired in, prepared statements should be the default for every query path.
- Card images still point at Scryfall-hosted image URLs.
- Image binaries do not belong in D1; only image URLs are stored.
- This project is intentionally small: it owns the API boundary first.

## Next likely steps

1. Move the shared `Card` contract into Playmat `shared/` so both repos import the same schema.
2. Point Playmat's deck builder at this Worker instead of direct Scryfall calls.
3. Replace the live Scryfall proxy path with prepared D1 queries.

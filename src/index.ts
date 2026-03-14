import { mapScryfallCard, type Card, type ScryfallCard } from "./card";

type LookupRequest = {
  names: string[];
};

type ScryfallCollectionResponse = {
  data: ScryfallCard[];
};

const SEARCH_CACHE_TTL_SECONDS = 60 * 30;
const LOOKUP_CACHE_TTL_SECONDS = 60 * 60 * 6;
const ALLOWED_ORIGIN = "*";
const SCRYFALL_HEADERS = {
  accept: "application/json",
  "user-agent": "playmat-card-db/0.1",
};

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);

  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("access-control-allow-origin", ALLOWED_ORIGIN);
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "content-type");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function errorResponse(status: number, message: string): Response {
  return json({ error: message }, { status });
}

function emptyResponse(status = 204): Response {
  return new Response(null, {
    status,
    headers: {
      "access-control-allow-origin": ALLOWED_ORIGIN,
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

function withCacheHeaders(response: Response, ttlSeconds: number): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", `public, max-age=${ttlSeconds}`);
  headers.set("cdn-cache-control", `public, max-age=${ttlSeconds}`);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function toScryfallSearchUrl(query: string): URL {
  const url = new URL("https://api.scryfall.com/cards/search");
  url.searchParams.set("q", `${query.trim()} game:paper`);
  url.searchParams.set("unique", "cards");
  url.searchParams.set("order", "name");
  return url;
}

async function fetchScryfallJson<T>(url: URL | string, init?: RequestInit): Promise<T | null> {
  const headers = new Headers(init?.headers);

  for (const [key, value] of Object.entries(SCRYFALL_HEADERS)) {
    headers.set(key, value);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Scryfall request failed with ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getCached(request: Request): Promise<Response | undefined> {
  const cache = await caches.open("playmat-card-db");
  const cached = await cache.match(request);
  return cached ?? undefined;
}

async function putCached(request: Request, response: Response): Promise<void> {
  const cache = await caches.open("playmat-card-db");
  await cache.put(request, response.clone());
}

function mapCards(cards: ScryfallCard[], limit?: number): Card[] {
  const mapped = cards.map(mapScryfallCard);
  return typeof limit === "number" ? mapped.slice(0, limit) : mapped;
}

async function lookupByNames(names: string[]): Promise<Card[]> {
  const cards: Card[] = [];

  for (let index = 0; index < names.length; index += 75) {
    const chunk = names.slice(index, index + 75);
    const payload = await fetchScryfallJson<ScryfallCollectionResponse>("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        identifiers: chunk.map((name) => ({ name })),
      }),
    });

    cards.push(...mapCards(payload?.data ?? []));
  }

  return cards;
}

async function handleSearch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return json({ data: [] });
  }

  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const payload = await fetchScryfallJson<{ data: ScryfallCard[] }>(toScryfallSearchUrl(query));
  const response = withCacheHeaders(json({ data: mapCards(payload?.data ?? [], 18) }), SEARCH_CACHE_TTL_SECONDS);

  await putCached(cacheKey, response);
  return response;
}

async function handleLookup(request: Request): Promise<Response> {
  const body = (await request.json()) as Partial<LookupRequest>;
  const names = Array.from(new Set((body.names ?? []).map((name) => name.trim()).filter(Boolean)));

  if (!names.length) {
    return json({ data: [] });
  }

  const hash = await sha256Hex(JSON.stringify([...names].sort((left, right) => left.localeCompare(right))));
  const cacheKey = new Request(`https://playmat-card-db.internal/cache/lookup/${hash}`, { method: "GET" });
  const cached = await getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = withCacheHeaders(json({ data: await lookupByNames(names) }), LOOKUP_CACHE_TTL_SECONDS);
  await putCached(cacheKey, response);
  return response;
}

async function handleGetByName(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const encodedName = url.pathname.replace(/^\/cards\/by-name\//, "");
  const name = decodeURIComponent(encodedName).trim();

  if (!name) {
    return errorResponse(400, "Card name is required.");
  }

  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const card = (await lookupByNames([name]))[0] ?? null;
  const response = withCacheHeaders(json({ data: card }), LOOKUP_CACHE_TTL_SECONDS);

  await putCached(cacheKey, response);
  return response;
}

async function router(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return emptyResponse();
  }

  if (request.method === "GET" && url.pathname === "/health") {
    return json({ ok: true, service: "playmat-card-db" });
  }

  if (request.method === "GET" && url.pathname === "/") {
    return json({
      service: "playmat-card-db",
      ok: true,
      routes: {
        health: "/health",
        search: "/cards/search?q=lightning+bolt",
        lookup: "/cards/lookup",
        byName: "/cards/by-name/Lightning%20Bolt",
      },
    });
  }

  if (request.method === "GET" && url.pathname === "/cards/search") {
    return handleSearch(request);
  }

  if (request.method === "POST" && url.pathname === "/cards/lookup") {
    return handleLookup(request);
  }

  if (request.method === "GET" && url.pathname.startsWith("/cards/by-name/")) {
    return handleGetByName(request);
  }

  return errorResponse(404, "Not found.");
}

const worker = {
  async fetch(request: Request): Promise<Response> {
    try {
      return await router(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return errorResponse(500, message);
    }
  },
};

export default worker;

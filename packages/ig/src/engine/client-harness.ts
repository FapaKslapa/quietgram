import { createEngineClient } from "#ig/engine/client";

export const SECRET = "test-secret-0123456789";
export const NOW_MS = 1_700_000_000_000;

export type Seen = { url: string; method: string; headers: Headers; body: string };

export const fakeFetch = (respond: (seen: Seen) => Response | Error) => {
  const seen: Seen[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const entry: Seen = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? init.body : "",
    };
    seen.push(entry);
    const result = respond(entry);
    if (result instanceof Error) throw result;
    return result;
  };
  return { fetcher, seen };
};

export const json = (body: unknown, status = 200): Response => Response.json(body, { status });

export const clientWith = (respond: (seen: Seen) => Response | Error) => {
  const fake = fakeFetch(respond);
  const client = createEngineClient({
    baseUrl: "https://engine.test/",
    secret: SECRET,
    accountId: "1000",
    fetcher: fake.fetcher,
    now: () => NOW_MS,
  });
  return { client, seen: fake.seen };
};

export const post = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  code: "Cabc123",
  author_id: "7",
  author_username: "ada",
  caption: null,
  taken_at_ms: 1_700_000_000_123,
  product_type: "feed",
  media: [{ kind: "image", url: "https://cdn/a.jpg", width: 10, height: 20 }],
  ...overrides,
});

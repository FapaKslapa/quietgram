import { type Db, igSessions, user, userSettings } from "@nodistraction/db";
import { createTestDb } from "@nodistraction/db/testing";
import { createEngineClient, type IgCookies, type Requester } from "@nodistraction/ig";
import { encrypt } from "@/lib/auth/crypto";
import type { SyncDeps } from "@/lib/sync/deps";
import { createDirectSource, createEngineSource, type SourceFactory } from "@/lib/sync/source";
import { throttle } from "@/lib/sync/throttle";
import type { TRPCContext } from "@/server/trpc/init";

export const COOKIE_KEY = btoa("k".repeat(32));
export const OWNER = "owner";
export const IG_USER_ID = "1000";

export type RecordedCall = {
  method: "get" | "postForm";
  path: string;
  params: Record<string, string> | undefined;
};

export type Responder = (call: RecordedCall) => unknown;

export type EngineCall = {
  method: string;
  path: string;
  query: Record<string, string>;
  body: string;
  accountId: string | null;
};

export type EngineResponder = (call: EngineCall) => unknown;

export const ENGINE_SECRET = "engine-secret-0123456789";

export class EngineFailure {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {}
}

export const fakeEngine = (respond: EngineResponder) => {
  const calls: EngineCall[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const call: EngineCall = {
      method: init?.method ?? "GET",
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body: typeof init?.body === "string" ? init.body : "",
      accountId: new Headers(init?.headers).get("x-ig-account-id"),
    };
    calls.push(call);
    const result = respond(call);
    if (result instanceof Error) throw result;
    if (result instanceof EngineFailure)
      return Response.json(result.body, { status: result.status });
    return Response.json(result);
  };
  return { fetcher, calls };
};

export const fakeRequester = (respond: Responder) => {
  const calls: RecordedCall[] = [];
  const handle = async (call: RecordedCall): Promise<unknown> => {
    calls.push(call);
    return respond(call);
  };
  const requester: Requester = {
    get: (path, params) => handle({ method: "get", path, params }),
    postForm: (path, body) => handle({ method: "postForm", path, params: body }),
  };
  return { requester, calls };
};

export const seedOwner = async (db: Db, ownerId = OWNER): Promise<void> => {
  await db.insert(user).values({ id: ownerId, name: ownerId, email: `${ownerId}@example.com` });
};

export const seedSession = async (
  db: Db,
  ownerId = OWNER,
  status: "active" | "expired" = "active",
): Promise<void> => {
  const cookies: IgCookies = { sessionId: "s", csrfToken: "c", userId: IG_USER_ID };
  const { cipher, iv } = await encrypt(JSON.stringify(cookies), COOKIE_KEY);
  await db
    .insert(igSessions)
    .values({ ownerId, igUserId: IG_USER_ID, cipher, iv, status, updatedAt: new Date(0) });
};

export type TestEnv = {
  db: Db;
  deps: SyncDeps;
  context: TRPCContext;
  calls: RecordedCall[];
  engineCalls: EngineCall[];
  clock: { current: Date };
  delays: { count: number };
};

export const createTestEnv = async (
  respond: Responder = () => {
    throw new Error("unexpected request");
  },
  options: {
    withSession?: boolean;
    engine?: EngineResponder;
    dmSendEnabled?: boolean;
    interactionsEnabled?: boolean;
  } = {},
): Promise<TestEnv> => {
  const db = createTestDb();
  await seedOwner(db);
  if (options.withSession ?? true) await seedSession(db);
  if (options.dmSendEnabled || options.interactionsEnabled) {
    await db.insert(userSettings).values({
      ownerId: OWNER,
      dmSendEnabled: options.dmSendEnabled ?? false,
      interactionsEnabled: options.interactionsEnabled ?? false,
    });
  }
  const { requester, calls } = fakeRequester(respond);
  const delays = { count: 0 };
  const clock = { current: new Date("2026-10-04T12:00:00Z") };
  const delay = async (): Promise<void> => {
    delays.count += 1;
  };
  const engine = options.engine ? fakeEngine(options.engine) : null;
  const source: SourceFactory = engine
    ? {
        kind: "engine",
        create: (account) =>
          createEngineSource(
            createEngineClient({
              baseUrl: "https://engine.test",
              secret: ENGINE_SECRET,
              accountId: account.igUserId,
              fetcher: engine.fetcher,
            }),
            account.loadCookies,
          ),
      }
    : { kind: "direct", create: () => createDirectSource(throttle(requester, delay)) };
  const runtime = { getCookieKey: () => COOKIE_KEY, now: () => clock.current, source, delay };
  return {
    db,
    deps: { db, ...runtime },
    context: { db, getSession: async () => ({ user: { id: OWNER } }), sync: runtime },
    calls,
    engineCalls: engine?.calls ?? [],
    clock,
    delays,
  };
};

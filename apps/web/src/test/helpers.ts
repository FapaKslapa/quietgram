import { type Db, igSessions, user } from "@nodistraction/db";
import { createTestDb } from "@nodistraction/db/testing";
import type { IgCookies, Requester } from "@nodistraction/ig";
import { encrypt } from "@/lib/auth/crypto";
import type { SyncDeps } from "@/lib/sync/deps";
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
  clock: { current: Date };
  delays: { count: number };
};

export const createTestEnv = async (
  respond: Responder = () => {
    throw new Error("unexpected request");
  },
  options: { withSession?: boolean } = {},
): Promise<TestEnv> => {
  const db = createTestDb();
  await seedOwner(db);
  if (options.withSession ?? true) await seedSession(db);
  const { requester, calls } = fakeRequester(respond);
  const delays = { count: 0 };
  const clock = { current: new Date("2026-10-04T12:00:00Z") };
  const runtime = {
    getCookieKey: () => COOKIE_KEY,
    now: () => clock.current,
    createRequester: () => requester,
    delay: async () => {
      delays.count += 1;
    },
  };
  return {
    db,
    deps: { db, ...runtime },
    context: { db, getSession: async () => ({ user: { id: OWNER } }), sync: runtime },
    calls,
    clock,
    delays,
  };
};

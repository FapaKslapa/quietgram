import {
  checkSession,
  createEngineClient,
  createRequester,
  type EngineClient,
  fetchInbox,
  fetchSaved,
  fetchThread,
  fetchTimelinePage,
  fetchUserCounts,
  fetchUsersPage,
  type IgCookies,
  type IgMessage,
  type IgPost,
  type IgThread,
  type Requester,
  SessionExpiredError,
  sendText,
  type TimelinePage,
  type UserCounts,
  type UsersPage,
} from "@nodistraction/ig";
import type { AppEnv } from "@/lib/env";
import { throttle } from "@/lib/sync/throttle";

export type SourceKind = "engine" | "direct";

export type InstagramSource = {
  kind: SourceKind;
  refreshSession: () => Promise<void>;
  checkSession: () => Promise<void>;
  usersPage: (
    kind: "following" | "followers",
    userId: string,
    cursor: string | null,
  ) => Promise<UsersPage>;
  timelinePage: (cursor?: string) => Promise<TimelinePage>;
  userPosts: ((userId: string, amount: number) => Promise<IgPost[]>) | null;
  userCounts: (userId: string) => Promise<UserCounts | null>;
  saved: () => Promise<IgPost[]>;
  inbox: () => Promise<IgThread[]>;
  thread: (threadId: string) => Promise<IgMessage[]>;
  sendText: (threadId: string, text: string) => Promise<void>;
};

export type SourceAccount = {
  igUserId: string;
  loadCookies: () => Promise<IgCookies>;
};

export type SourceFactory = {
  kind: SourceKind;
  create: (account: SourceAccount) => InstagramSource;
};

export const ENGINE_GRAPH_AMOUNT = 1000;
export const ENGINE_SAVED_AMOUNT = 100;
export const ENGINE_INBOX_AMOUNT = 50;
export const ENGINE_THREAD_AMOUNT = 50;

export const createDirectSource = (requester: Requester): InstagramSource => ({
  kind: "direct",
  refreshSession: async () => {},
  checkSession: () => checkSession(requester),
  usersPage: (kind, userId, cursor) => fetchUsersPage(requester, kind, userId, cursor),
  timelinePage: (cursor) => fetchTimelinePage(requester, cursor),
  userPosts: null,
  userCounts: (userId) => fetchUserCounts(requester, userId),
  saved: () => fetchSaved(requester),
  inbox: () => fetchInbox(requester),
  thread: (threadId) => fetchThread(requester, threadId),
  sendText: (threadId, text) => sendText(requester, threadId, text),
});

export const createEngineSource = (
  client: EngineClient,
  loadCookies: () => Promise<IgCookies>,
): InstagramSource => {
  let ensured: Promise<void> | null = null;

  const handOver = async (): Promise<void> => {
    const cookies = await loadCookies();
    const status = await client.putSession(cookies.sessionId);
    if (!status.active) throw new SessionExpiredError();
  };

  const ensure = (): Promise<void> => {
    ensured ??= (async () => {
      const status = await client.sessionStatus();
      if (!status.active) await handOver();
    })().catch((error: unknown) => {
      ensured = null;
      throw error;
    });
    return ensured;
  };

  const ready = async <T>(task: () => Promise<T>): Promise<T> => {
    await ensure();
    return task();
  };

  return {
    kind: "engine",
    refreshSession: async () => {
      await handOver();
      ensured = Promise.resolve();
    },
    checkSession: () =>
      ready(async () => {
        await client.following(1);
      }),
    usersPage: (kind) =>
      ready(async () => ({
        users:
          kind === "following"
            ? await client.following(ENGINE_GRAPH_AMOUNT)
            : await client.followers(ENGINE_GRAPH_AMOUNT),
        nextCursor: null,
      })),
    timelinePage: (cursor) => ready(() => client.timeline(cursor)),
    userPosts: (userId, amount) => ready(() => client.userPosts(userId, amount)),
    userCounts: async () => null,
    saved: () => ready(() => client.saved(ENGINE_SAVED_AMOUNT)),
    inbox: () => ready(() => client.threads(ENGINE_INBOX_AMOUNT)),
    thread: (threadId) => ready(() => client.thread(threadId, ENGINE_THREAD_AMOUNT)),
    sendText: (threadId, text) =>
      ready(async () => {
        await client.sendMessage(threadId, text);
      }),
  };
};

const lazyRequester = (loadCookies: () => Promise<IgCookies>): Requester => {
  let pending: Promise<Requester> | null = null;
  const resolve = (): Promise<Requester> => {
    pending ??= loadCookies().then((cookies) => createRequester(cookies));
    return pending;
  };
  return {
    get: async (path, params) => (await resolve()).get(path, params),
    postForm: async (path, body) => (await resolve()).postForm(path, body),
  };
};

export const createSourceFactory = (
  env: Pick<AppEnv, "IG_ENGINE_URL" | "IG_ENGINE_SECRET">,
  delay: () => Promise<void>,
): SourceFactory => {
  const { IG_ENGINE_URL: baseUrl, IG_ENGINE_SECRET: secret } = env;
  if (baseUrl && secret) {
    return {
      kind: "engine",
      create: (account) =>
        createEngineSource(
          createEngineClient({ baseUrl, secret, accountId: account.igUserId }),
          account.loadCookies,
        ),
    };
  }
  return {
    kind: "direct",
    create: (account) => createDirectSource(throttle(lazyRequester(account.loadCookies), delay)),
  };
};

export const createSessionHandOff = (
  env: Pick<AppEnv, "IG_ENGINE_URL" | "IG_ENGINE_SECRET">,
  fetcher?: typeof fetch,
): ((igUserId: string, sessionId: string) => Promise<void>) | null => {
  const { IG_ENGINE_URL: baseUrl, IG_ENGINE_SECRET: secret } = env;
  if (!baseUrl || !secret) return null;
  return async (igUserId, sessionId) => {
    const client = createEngineClient({
      baseUrl,
      secret,
      accountId: igUserId,
      ...(fetcher ? { fetcher } : {}),
    });
    await client.putSession(sessionId);
  };
};

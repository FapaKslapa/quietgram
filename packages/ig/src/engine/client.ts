import type { IgMessage, IgThread } from "#ig/direct";
import { EngineSendDisabledError, EngineUnreachableError } from "#ig/engine/errors";
import {
  type EnginePost,
  errorBodySchema,
  messagesResponseSchema,
  postsResponseSchema,
  sentMessageSchema,
  sessionStatusSchema,
  threadsResponseSchema,
  timelineResponseSchema,
  usersResponseSchema,
} from "#ig/engine/schemas";
import { signedTarget, signRequest } from "#ig/engine/sign";
import { IgHttpError, IgThrottledError, SessionExpiredError } from "#ig/errors";
import type { IgUser } from "#ig/mutuals";
import { type IgPost, isReel, type TimelinePage } from "#ig/posts";

export type EngineSessionStatus = { active: boolean; username: string | null };

export type EngineClientOptions = {
  baseUrl: string;
  secret: string;
  accountId: string;
  fetcher?: typeof fetch;
  now?: () => number;
};

type Query = ReadonlyArray<[string, string]>;

const USER_AGENT = "nodistraction-worker/1.0";
const API_PREFIX = "/v1";

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const toPost = (post: EnginePost): IgPost => ({
  id: post.id,
  authorId: post.author_id,
  authorUsername: post.author_username,
  caption: post.caption,
  takenAt: post.taken_at_ms,
  media: post.media,
});

const toPosts = (posts: EnginePost[]): IgPost[] =>
  posts.filter((post) => !isReel(post)).map(toPost);

const toUsers = (response: {
  users: Array<{ id: string; username: string; avatar_url: string | null; is_verified: boolean }>;
}): IgUser[] =>
  response.users.map((user) => ({
    id: user.id,
    username: user.username,
    avatarUrl: user.avatar_url,
    isVerified: user.is_verified,
  }));

const toMessage = (message: {
  id: string;
  sender_id: string | null;
  text: string | null;
  sent_at_ms: number;
}): IgMessage => ({
  id: message.id,
  senderId: message.sender_id ?? "",
  type: message.text === null ? "other" : "text",
  text: message.text,
  sentAt: message.sent_at_ms,
});

const failure = (status: number, text: string): Error => {
  const body = errorBodySchema.safeParse(parseJson(text));
  const code = body.success ? body.data.code : null;
  if (status === 429 && code === "throttled") return new IgThrottledError();
  if (status === 401 && code === "session_expired") return new SessionExpiredError();
  if (status === 403 && code === "send_disabled") return new EngineSendDisabledError();
  return new IgHttpError(status);
};

const amountQuery = (amount: number): Query => [["amount", String(amount)]];

export const createEngineClient = (options: EngineClientOptions) => {
  const fetcher: typeof fetch = options.fetcher ?? ((input, init) => fetch(input, init));
  const now = options.now ?? Date.now;
  const base = options.baseUrl.replace(/\/+$/, "");

  const call = async (
    method: "GET" | "PUT" | "POST",
    path: string,
    query: Query = [],
    payload?: unknown,
  ): Promise<unknown> => {
    const target = signedTarget(`${API_PREFIX}${path}`, query);
    const body = payload === undefined ? "" : JSON.stringify(payload);
    const timestamp = String(Math.floor(now() / 1000));
    const signature = await signRequest({
      secret: options.secret,
      timestamp,
      method,
      target,
      body,
    });
    const headers: Record<string, string> = {
      "user-agent": USER_AGENT,
      "x-engine-timestamp": timestamp,
      "x-engine-signature": signature,
      "x-ig-account-id": options.accountId,
    };
    const init: RequestInit = { method, headers };
    if (payload !== undefined) {
      headers["content-type"] = "application/json";
      init.body = body;
    }
    let response: Response;
    try {
      response = await fetcher(`${base}${target}`, init);
    } catch (error) {
      throw new EngineUnreachableError(error);
    }
    const text = await response.text();
    if (!response.ok) throw failure(response.status, text);
    const json = parseJson(text);
    if (json === undefined) throw new IgHttpError(response.status);
    return json;
  };

  return {
    putSession: async (sessionId: string): Promise<EngineSessionStatus> =>
      sessionStatusSchema.parse(await call("PUT", "/session", [], { sessionid: sessionId })),

    sessionStatus: async (): Promise<EngineSessionStatus> =>
      sessionStatusSchema.parse(await call("GET", "/session")),

    following: async (amount: number): Promise<IgUser[]> =>
      toUsers(usersResponseSchema.parse(await call("GET", "/following", amountQuery(amount)))),

    followers: async (amount: number): Promise<IgUser[]> =>
      toUsers(usersResponseSchema.parse(await call("GET", "/followers", amountQuery(amount)))),

    userPosts: async (userId: string, amount: number): Promise<IgPost[]> =>
      toPosts(
        postsResponseSchema.parse(
          await call("GET", `/users/${encodeURIComponent(userId)}/posts`, amountQuery(amount)),
        ).posts,
      ),

    timeline: async (cursor?: string): Promise<TimelinePage> => {
      const page = timelineResponseSchema.parse(
        await call("GET", "/timeline", cursor ? [["cursor", cursor]] : []),
      );
      return { posts: toPosts(page.posts), nextCursor: page.next_cursor };
    },

    saved: async (amount: number): Promise<IgPost[]> =>
      toPosts(postsResponseSchema.parse(await call("GET", "/saved", amountQuery(amount))).posts),

    threads: async (amount: number): Promise<IgThread[]> =>
      threadsResponseSchema
        .parse(await call("GET", "/threads", amountQuery(amount)))
        .threads.map((thread) => ({
          id: thread.id,
          title: thread.title,
          lastActivityAt: thread.last_activity_at_ms,
          unread: thread.unread,
        })),

    thread: async (id: string, amount: number): Promise<IgMessage[]> =>
      messagesResponseSchema
        .parse(await call("GET", `/threads/${encodeURIComponent(id)}`, amountQuery(amount)))
        .messages.map(toMessage),

    sendMessage: async (id: string, text: string): Promise<IgMessage> =>
      toMessage(
        sentMessageSchema.parse(
          await call("POST", `/threads/${encodeURIComponent(id)}/messages`, [], { text }),
        ),
      ),
  };
};

export type EngineClient = ReturnType<typeof createEngineClient>;

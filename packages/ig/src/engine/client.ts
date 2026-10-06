import type { IgMessage, IgThread } from "#ig/direct";
import {
  EngineInteractionsDisabledError,
  EngineResponseError,
  EngineSendDisabledError,
  EngineUnreachableError,
} from "#ig/engine/errors";
import {
  commentsResponseSchema,
  type EngineComment,
  type EngineMessage,
  type EnginePost,
  type EngineProfile,
  type EngineStory,
  type EngineTrayEntry,
  type EngineUser,
  errorBodySchema,
  messagesResponseSchema,
  okResponseSchema,
  postsResponseSchema,
  profileResponseSchema,
  sentMessageSchema,
  sessionStatusSchema,
  storiesResponseSchema,
  threadsResponseSchema,
  timelineResponseSchema,
  trayResponseSchema,
  userPostsResponseSchema,
  usersResponseSchema,
} from "#ig/engine/schemas";
import { signedTarget, signRequest } from "#ig/engine/sign";
import { IgHttpError, IgThrottledError, SessionExpiredError } from "#ig/errors";
import type { IgUser } from "#ig/mutuals";
import { type IgPost, isReel, type TimelinePage } from "#ig/posts";
import {
  type IgComment,
  type IgProfile,
  type IgStory,
  type IgTrayEntry,
  validateCommentText,
} from "#ig/social";

export type UserPostsPage = { posts: IgPost[]; nextCursor: string | null };

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

type Checkable<T> = {
  safeParse: (
    value: unknown,
  ) =>
    | { success: true; data: T }
    | { success: false; error: { issues: ReadonlyArray<{ path: PropertyKey[] }> } };
};

const check = <T>(schema: Checkable<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const path = result.error.issues[0]?.path.map(String).join(".");
  throw new EngineResponseError(path ? path : "root");
};

const toPost = (post: EnginePost): IgPost => ({
  id: post.id,
  code: post.code ?? null,
  productType: post.product_type ?? "feed",
  authorId: post.author_id,
  authorUsername: post.author_username,
  caption: post.caption ?? null,
  takenAt: post.taken_at_ms,
  media: post.media.map((item) => ({
    kind: item.kind,
    url: item.url,
    width: item.width ?? 0,
    height: item.height ?? 0,
  })),
});

const toPosts = (posts: EnginePost[]): IgPost[] =>
  posts.filter((post) => !isReel(post)).map(toPost);

const toUsers = (response: { users: EngineUser[] }): IgUser[] =>
  response.users.map((user) => ({
    id: user.id,
    username: user.username,
    avatarUrl: user.avatar_url ?? null,
    isVerified: user.is_verified ?? false,
    latestReelMedia: user.latest_reel_media ?? null,
  }));

const toMessage = (message: EngineMessage): IgMessage => ({
  id: message.id,
  senderId: message.sender_id ?? "",
  type: message.text == null ? "other" : "text",
  kind: message.kind ?? (message.text ? "text" : "other"),
  text: message.text ?? null,
  sentAt: message.sent_at_ms,
});

const toTrayEntry = (entry: EngineTrayEntry): IgTrayEntry => ({
  userId: entry.user_id,
  username: entry.username,
  avatarUrl: entry.avatar_url ?? null,
  latestReelMedia: entry.latest_reel_media ?? null,
  seen: entry.seen,
});

const toStory = (story: EngineStory): IgStory => ({
  id: story.id,
  takenAt: story.taken_at_ms,
  expiresAt: story.expires_at_ms,
  media: {
    kind: story.media.kind,
    url: story.media.url,
    width: story.media.width ?? 0,
    height: story.media.height ?? 0,
  },
  productType: story.product_type ?? "story",
});

const toProfile = (profile: EngineProfile): IgProfile => ({
  id: profile.id,
  username: profile.username,
  fullName: profile.full_name,
  biography: profile.biography,
  avatarUrl: profile.avatar_url ?? null,
  isPrivate: profile.is_private,
  isVerified: profile.is_verified,
  isBusiness: profile.is_business,
  followerCount: profile.follower_count,
  followingCount: profile.following_count,
  mediaCount: profile.media_count,
  externalUrl: profile.external_url ? profile.external_url : null,
  friendship: {
    following: profile.friendship.following,
    followedBy: profile.friendship.followed_by,
  },
});

const toComment = (comment: EngineComment): IgComment => ({
  id: comment.id,
  userId: comment.user_id,
  username: comment.username,
  avatarUrl: comment.avatar_url ?? null,
  text: comment.text,
  createdAt: comment.created_at_ms,
  likeCount: comment.like_count,
  parentId: comment.parent_id ?? null,
});

const failure = (status: number, text: string): Error => {
  const body = errorBodySchema.safeParse(parseJson(text));
  const code = body.success ? body.data.code : null;
  if (status === 429 && code === "throttled") return new IgThrottledError();
  if (status === 401 && code === "session_expired") return new SessionExpiredError();
  if (status === 403 && code === "send_disabled") return new EngineSendDisabledError();
  if (status === 403 && code === "interactions_disabled")
    return new EngineInteractionsDisabledError();
  return new IgHttpError(status);
};

const amountQuery = (amount: number): Query => [["amount", String(amount)]];

export const createEngineClient = (options: EngineClientOptions) => {
  const fetcher: typeof fetch = options.fetcher ?? ((input, init) => fetch(input, init));
  const now = options.now ?? Date.now;
  const base = options.baseUrl.replace(/\/+$/, "");

  const call = async (
    method: "GET" | "PUT" | "POST" | "DELETE",
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

  const mediaPath = (mediaId: string): string => encodeURIComponent(mediaId);

  const act = async (method: "POST" | "DELETE", path: string, payload?: unknown): Promise<void> => {
    check(okResponseSchema, await call(method, path, [], payload));
  };

  return {
    putSession: async (sessionId: string): Promise<EngineSessionStatus> =>
      check(sessionStatusSchema, await call("PUT", "/session", [], { sessionid: sessionId })),

    sessionStatus: async (): Promise<EngineSessionStatus> =>
      check(sessionStatusSchema, await call("GET", "/session")),

    following: async (amount: number): Promise<IgUser[]> =>
      toUsers(check(usersResponseSchema, await call("GET", "/following", amountQuery(amount)))),

    followers: async (amount: number): Promise<IgUser[]> =>
      toUsers(check(usersResponseSchema, await call("GET", "/followers", amountQuery(amount)))),

    userPosts: async (userId: string, amount: number, cursor?: string): Promise<UserPostsPage> => {
      const query: Query = cursor
        ? [...amountQuery(amount), ["cursor", cursor]]
        : amountQuery(amount);
      const page = check(
        userPostsResponseSchema,
        await call("GET", `/users/${encodeURIComponent(userId)}/posts`, query),
      );
      return { posts: toPosts(page.posts), nextCursor: page.next_cursor ?? null };
    },

    storiesTray: async (): Promise<IgTrayEntry[]> =>
      check(trayResponseSchema, await call("GET", "/stories/tray")).tray.map(toTrayEntry),

    userStories: async (userId: string): Promise<IgStory[]> =>
      check(
        storiesResponseSchema,
        await call("GET", `/users/${encodeURIComponent(userId)}/stories`),
      ).stories.map(toStory),

    userProfile: async (userId: string): Promise<IgProfile> =>
      toProfile(
        check(
          profileResponseSchema,
          await call("GET", `/users/${encodeURIComponent(userId)}/profile`),
        ),
      ),

    comments: async (mediaId: string, amount: number): Promise<IgComment[]> =>
      check(
        commentsResponseSchema,
        await call("GET", `/posts/${encodeURIComponent(mediaId)}/comments`, amountQuery(amount)),
      ).comments.map(toComment),

    like: (mediaId: string): Promise<void> => act("POST", `/posts/${mediaPath(mediaId)}/like`),

    unlike: (mediaId: string): Promise<void> => act("DELETE", `/posts/${mediaPath(mediaId)}/like`),

    save: (mediaId: string): Promise<void> => act("POST", `/posts/${mediaPath(mediaId)}/save`),

    unsave: (mediaId: string): Promise<void> => act("DELETE", `/posts/${mediaPath(mediaId)}/save`),

    addComment: async (mediaId: string, text: string): Promise<void> =>
      act("POST", `/posts/${mediaPath(mediaId)}/comments`, { text: validateCommentText(text) }),

    deleteComment: (mediaId: string, commentId: string): Promise<void> =>
      act("DELETE", `/posts/${mediaPath(mediaId)}/comments/${encodeURIComponent(commentId)}`),

    timeline: async (cursor?: string): Promise<TimelinePage> => {
      const page = check(
        timelineResponseSchema,
        await call("GET", "/timeline", cursor ? [["cursor", cursor]] : []),
      );
      return { posts: toPosts(page.posts), nextCursor: page.next_cursor ?? null };
    },

    saved: async (amount: number): Promise<IgPost[]> =>
      check(postsResponseSchema, await call("GET", "/saved", amountQuery(amount))).posts.map(
        toPost,
      ),

    threads: async (amount: number): Promise<IgThread[]> =>
      check(threadsResponseSchema, await call("GET", "/threads", amountQuery(amount))).threads.map(
        (thread) => ({
          id: thread.id,
          title: thread.title,
          lastActivityAt: thread.last_activity_at_ms,
          unread: thread.unread,
        }),
      ),

    thread: async (id: string, amount: number): Promise<IgMessage[]> =>
      check(
        messagesResponseSchema,
        await call("GET", `/threads/${encodeURIComponent(id)}`, amountQuery(amount)),
      ).messages.map(toMessage),

    sendMessage: async (id: string, text: string): Promise<IgMessage> =>
      toMessage(
        check(
          sentMessageSchema,
          await call("POST", `/threads/${encodeURIComponent(id)}/messages`, [], { text }),
        ),
      ),
  };
};

export type EngineClient = ReturnType<typeof createEngineClient>;

import type { IgMessage, IgThread } from "#ig/direct";
import {
  toComment,
  toMessage,
  toPost,
  toPosts,
  toProfile,
  toStory,
  toTrayEntry,
  toUsers,
} from "#ig/engine/mappers";
import { check } from "#ig/engine/response";
import {
  commentsResponseSchema,
  loginResultSchema,
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
import { createTransport, type Query, type TransportOptions } from "#ig/engine/transport";
import type { IgUser } from "#ig/mutuals";
import type { IgPost, TimelinePage } from "#ig/posts";
import {
  type IgComment,
  type IgProfile,
  type IgStory,
  type IgTrayEntry,
  validateCommentText,
} from "#ig/social";

export type UserPostsPage = { posts: IgPost[]; nextCursor: string | null };

export type EngineSessionStatus = { active: boolean; username: string | null };

export type EngineCredentials = { username: string; password: string; totpSecret?: string | undefined };

export type EngineLoginResult = {
  sessionId: string;
  csrfToken: string;
  userId: string;
  username: string;
};

export type EngineClientOptions = TransportOptions;

const amountQuery = (amount: number): Query => [["amount", String(amount)]];

export const createEngineClient = (options: EngineClientOptions) => {
  const call = createTransport(options);

  const mediaPath = (mediaId: string): string => encodeURIComponent(mediaId);

  const act = async (method: "POST" | "DELETE", path: string, payload?: unknown): Promise<void> => {
    check(okResponseSchema, await call(method, path, [], payload));
  };

  return {
    putSession: async (sessionId: string): Promise<EngineSessionStatus> =>
      check(sessionStatusSchema, await call("PUT", "/session", [], { sessionid: sessionId })),

    loginWithCredentials: async (credentials: EngineCredentials): Promise<EngineLoginResult> => {
      const result = check(
        loginResultSchema,
        await call("POST", "/session/login", [], {
          username: credentials.username,
          password: credentials.password,
          ...(credentials.totpSecret ? { totp_secret: credentials.totpSecret } : {}),
        }),
      );
      return {
        sessionId: result.sessionid,
        csrfToken: result.csrftoken,
        userId: result.user_id,
        username: result.username,
      };
    },

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

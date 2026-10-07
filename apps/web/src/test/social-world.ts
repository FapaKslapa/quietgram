import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv, type EngineCall, EngineFailure } from "@/test/helpers";

export const createCaller = createCallerFactory(appRouter);

export const INTERACTIONS_OFF = "Le interazioni sono disattivate: attivale in Profilo.";

export const profileBody = (id: string) => ({
  id,
  username: `user_${id}`,
  full_name: "Nome",
  biography: "bio",
  avatar_url: "https://cdn/new.jpg",
  is_private: false,
  is_verified: true,
  is_business: false,
  follower_count: 10,
  following_count: 5,
  media_count: 2,
  external_url: null,
  friendship: { following: true, followed_by: false },
});

export const post = (id: string, productType = "feed") => ({
  id,
  code: `c${id}`,
  author_id: "7",
  author_username: "ada",
  caption: null,
  taken_at_ms: 5,
  product_type: productType,
  media: [{ kind: "image", url: "https://cdn/x.jpg", width: 1, height: 1 }],
});

export type Script = { fail: boolean };

export const engine =
  (script: Script) =>
  (call: EngineCall): unknown => {
    if (call.path === "/v1/session") return { active: true, username: "me" };
    if (script.fail) return new EngineFailure(502, { code: "upstream_error" });
    if (call.path === "/v1/stories/tray") {
      return {
        tray: [
          {
            user_id: "7",
            username: "ada",
            avatar_url: "https://cdn/ada-new.jpg",
            latest_reel_media: 9,
            seen: false,
          },
          { user_id: "8", username: "bob", avatar_url: null, latest_reel_media: 4, seen: true },
        ],
      };
    }
    if (call.path === "/v1/users/7/stories") {
      return {
        stories: [
          {
            id: "s1",
            taken_at_ms: 1,
            expires_at_ms: 2,
            media: { kind: "image", url: "https://cdn/s.jpg", width: 0, height: 0 },
            product_type: "story",
          },
        ],
      };
    }
    if (call.path.endsWith("/profile")) return profileBody(call.path.split("/")[3] ?? "");
    if (call.path === "/v1/users/7/posts") {
      return { posts: [post("p1"), post("p2")], next_cursor: call.query.cursor ? null : "next" };
    }
    if (call.path === "/v1/posts/55/comments" && call.method === "GET") {
      return {
        comments: [
          {
            id: "c1",
            user_id: "8",
            username: "bob",
            text: "bello",
            created_at_ms: 3,
            like_count: 1,
            parent_id: null,
          },
        ],
      };
    }
    if (call.path.startsWith("/v1/posts/")) return { ok: true };
    throw new Error(`unexpected ${call.method} ${call.path}`);
  };

export const setup = async (options: { interactionsEnabled?: boolean } = {}) => {
  const script: Script = { fail: false };
  const env = await createTestEnv(undefined, { engine: engine(script), ...options });
  const caller = createCaller(env.context);
  const writes = () => env.engineCalls.filter((call) => call.method !== "GET");
  const engineCalls = (path: string) => env.engineCalls.filter((call) => call.path === path);
  return { env, caller, script, writes, engineCalls };
};

export const advance = (clock: { current: Date }, ms: number) => {
  clock.current = new Date(clock.current.getTime() + ms);
};

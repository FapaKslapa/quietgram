import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import type { EngineCall } from "@/test/helpers";

export const createCaller = createCallerFactory(appRouter);

export const engineUser = (id: string) => ({
  id,
  username: `user_${id}`,
  avatar_url: null,
  is_verified: false,
  is_business: false,
  follower_count: null,
});

export const NOW = Date.parse("2026-10-04T12:00:00Z");
export const DAY = 86_400_000;
export const RECENT = NOW - DAY;

export const enginePost = (
  id: string,
  authorId: string,
  productType = "feed",
  takenAtMs = RECENT,
) => ({
  id,
  code: `code-${id}`,
  author_id: authorId,
  author_username: `user_${authorId}`,
  caption: null,
  taken_at_ms: takenAtMs,
  product_type: productType,
  media: [{ kind: "image", url: `https://cdn/${id}.jpg`, width: 10, height: 10 }],
});

export type World = {
  following?: string[];
  followers?: string[];
  active?: boolean;
  postsFor?: (authorId: string) => unknown[];
  timeline?: unknown[];
  fail?: (call: EngineCall) => unknown;
};

export const world = (config: World = {}) => {
  let active = config.active ?? true;
  return (call: EngineCall): unknown => {
    if (call.method === "PUT") active = true;
    const failure = config.fail?.(call);
    if (failure !== undefined) return failure;
    if (call.path === "/v1/session") return { active, username: "me" };
    if (call.path === "/v1/following") {
      return { users: (config.following ?? ["5071", "5008", "6000"]).map(engineUser) };
    }
    if (call.path === "/v1/followers") {
      return { users: (config.followers ?? ["5071"]).map(engineUser) };
    }
    if (call.path === "/v1/timeline") {
      return { posts: (config.timeline ?? []).slice(), next_cursor: null };
    }
    const match = /^\/v1\/users\/(\d+)\/posts$/.exec(call.path);
    if (match?.[1]) {
      const authorId = match[1];
      return {
        posts: (
          config.postsFor ??
          ((id) => [enginePost(`p-${id}`, id), enginePost(`r-${id}`, id, "clips")])
        )(authorId),
      };
    }
    throw new Error(`unexpected ${call.method} ${call.path}`);
  };
};

export const runToEnd = async (caller: ReturnType<typeof createCaller>) => {
  const { runId } = await caller.refresh.start();
  let progress = await caller.refresh.step({ runId });
  while (!progress.done) progress = await caller.refresh.step({ runId });
  return { runId, progress };
};

export const postCalls = (calls: EngineCall[]) =>
  calls.filter((call) => call.path.endsWith("/posts"));

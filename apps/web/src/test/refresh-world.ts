import timelineFixture from "@nodistraction/ig/fixtures/timeline.json" with { type: "json" };
import userInfoFixture from "@nodistraction/ig/fixtures/user-info.json" with { type: "json" };
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import type { RecordedCall } from "@/test/helpers";

export const createCaller = createCallerFactory(appRouter);

export const user = (pk: string) => ({ pk, username: `user_${pk}`, profile_pic_url: null });

export type World = {
  following?: string[];
  followers?: string[];
  timeline?: unknown;
  info?: (call: RecordedCall) => unknown;
};

export const world =
  (config: World = {}) =>
  (call: RecordedCall): unknown => {
    if (call.path.endsWith("/following/")) {
      return { users: (config.following ?? ["5071", "5008", "6000"]).map(user), next_max_id: null };
    }
    if (call.path.endsWith("/followers/")) {
      return { users: (config.followers ?? ["5071"]).map(user), next_max_id: null };
    }
    if (call.path === "/api/v1/feed/timeline/") return config.timeline ?? timelineFixture;
    if (call.path.includes("/info/")) return (config.info ?? (() => userInfoFixture))(call);
    throw new Error(`unexpected ${call.path}`);
  };

export const runToEnd = async (caller: ReturnType<typeof createCaller>) => {
  const { runId } = await caller.refresh.start();
  let progress = await caller.refresh.step({ runId });
  while (!progress.done) progress = await caller.refresh.step({ runId });
  return { runId, progress };
};

export const count = (calls: RecordedCall[], fragment: string) =>
  calls.filter((call) => call.path.includes(fragment)).length;

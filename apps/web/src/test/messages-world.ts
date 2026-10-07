import inboxFixture from "@nodistraction/ig/fixtures/inbox.json" with { type: "json" };
import threadFixture from "@nodistraction/ig/fixtures/thread.json" with { type: "json" };
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import type { RecordedCall } from "@/test/helpers";

export const createCaller = createCallerFactory(appRouter);

export const respond = (call: RecordedCall): unknown => {
  if (call.path === "/api/v1/direct_v2/inbox/") return inboxFixture;
  if (call.path.startsWith("/api/v1/direct_v2/threads/") && call.method === "get") {
    return threadFixture;
  }
  if (call.path === "/api/v1/direct_v2/threads/broadcast/text/") return { status: "ok" };
  throw new Error(`unexpected ${call.path}`);
};

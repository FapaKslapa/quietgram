import handler from "@open-next/worker";
import { runScheduledKeepAlive } from "@/lib/sync/scheduled";

export default {
  fetch: handler.fetch,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runScheduledKeepAlive(env));
  },
} satisfies ExportedHandler<CloudflareEnv>;

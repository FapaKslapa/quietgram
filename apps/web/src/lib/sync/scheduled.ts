import { createDb } from "@nodistraction/db";
import { parseEnv } from "@/lib/env";
import { randomDelay } from "@/lib/sync/deps";
import { runKeepAlive } from "@/lib/sync/keepalive";
import { createSourceFactory } from "@/lib/sync/source";

export const runScheduledKeepAlive = (env: CloudflareEnv): Promise<void> => {
  const appEnv = parseEnv({ ...env });
  return runKeepAlive({
    db: createDb(env.DB),
    getCookieKey: () => appEnv.COOKIE_KEY,
    now: () => new Date(),
    source: createSourceFactory(appEnv, randomDelay),
    delay: randomDelay,
  });
};

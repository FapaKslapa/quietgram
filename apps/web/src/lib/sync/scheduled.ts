import { createDb } from "@nodistraction/db";
import { createRequester } from "@nodistraction/ig";
import { parseEnv } from "@/lib/env";
import { randomDelay } from "@/lib/sync/deps";
import { runKeepAlive } from "@/lib/sync/keepalive";

export const runScheduledKeepAlive = (env: CloudflareEnv): Promise<void> => {
  const { COOKIE_KEY } = parseEnv({ ...env });
  return runKeepAlive({
    db: createDb(env.DB),
    getCookieKey: () => COOKIE_KEY,
    now: () => new Date(),
    createRequester: (cookies) => createRequester(cookies),
    delay: randomDelay,
  });
};

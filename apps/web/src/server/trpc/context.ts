import { createDb } from "@nodistraction/db";
import { createRequester } from "@nodistraction/ig";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/auth";
import { parseEnv } from "@/lib/env";
import { randomDelay } from "@/lib/sync/deps";
import type { TRPCContext } from "@/server/trpc/init";

export async function createTRPCContext(headers: Headers): Promise<TRPCContext> {
  const { env } = await getCloudflareContext({ async: true });
  const db = createDb(env.DB);
  return {
    db,
    getSession: () => createAuth(parseEnv({ ...env }), db).api.getSession({ headers }),
    sync: {
      getCookieKey: () => parseEnv({ ...env }).COOKIE_KEY,
      now: () => new Date(),
      createRequester: (cookies) => createRequester(cookies),
      delay: randomDelay,
    },
  };
}

import { createDb } from "@nodistraction/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/auth";
import { parseEnv } from "@/lib/env";
import type { TRPCContext } from "@/server/trpc/init";

export async function createTRPCContext(headers: Headers): Promise<TRPCContext> {
  const { env } = await getCloudflareContext({ async: true });
  const db = createDb(env.DB);
  return {
    db,
    getSession: () => createAuth(parseEnv({ ...env }), db).api.getSession({ headers }),
  };
}

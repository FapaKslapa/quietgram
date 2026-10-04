import { getCloudflareContext } from "@opennextjs/cloudflare";
import { initTRPC } from "@trpc/server";

export type TRPCContext = {
  env: CloudflareEnv;
  headers: Headers;
};

export async function createTRPCContext(headers: Headers): Promise<TRPCContext> {
  const { env } = await getCloudflareContext({ async: true });
  return { env, headers };
}

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

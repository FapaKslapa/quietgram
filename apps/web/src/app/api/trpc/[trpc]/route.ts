import { getCloudflareContext } from "@opennextjs/cloudflare";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { isTrustedRequestOrigin } from "@/lib/auth/origin";
import { parseEnv } from "@/lib/env";
import { logError, loggableMessage } from "@/server/log";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/routers/_app";

async function handler(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (!isTrustedRequestOrigin(req, parseEnv({ ...env }).BETTER_AUTH_URL)) {
    return new Response(null, { status: 403 });
  }
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext(req.headers),
    onError: ({ path, error }) => {
      logError({
        path,
        code: error.code,
        message: loggableMessage(path, error.message),
        cause: error.cause?.name,
      });
    },
  });
}

export { handler as GET, handler as POST };

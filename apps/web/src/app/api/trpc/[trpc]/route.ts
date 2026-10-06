import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { logError } from "@/server/log";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/routers/_app";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext(req.headers),
    onError: ({ path, error }) => {
      logError({
        path,
        code: error.code,
        message: error.message,
        cause: error.cause?.name,
      });
    },
  });
}

export { handler as GET, handler as POST };

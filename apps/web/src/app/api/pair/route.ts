import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handlePair } from "@/lib/auth/pair-handler";
import { createServices } from "@/lib/auth/server";
import { createSessionHandOff } from "@/lib/sync/source";

const handle = async (request: Request): Promise<Response> => {
  const { env } = await getCloudflareContext({ async: true });
  const { env: appEnv, db } = createServices(env);
  return handlePair(request, {
    db,
    cookieKey: appEnv.COOKIE_KEY,
    now: new Date(),
    handOffSession: createSessionHandOff(appEnv),
  });
};

export { handle as POST, handle as OPTIONS };

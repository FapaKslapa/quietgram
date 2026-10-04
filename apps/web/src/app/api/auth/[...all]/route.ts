import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServices } from "@/lib/auth/server";

const handle = async (request: Request): Promise<Response> => {
  const { env } = await getCloudflareContext({ async: true });
  return createServices(env).auth.handler(request);
};

export { handle as GET, handle as POST };

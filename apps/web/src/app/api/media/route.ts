import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServices } from "@/lib/auth/server";
import { isAllowedMediaType, MAX_MEDIA_REDIRECTS, parseMediaTarget } from "@/lib/media-proxy";

const FORWARDED = ["content-type", "content-length", "content-range", "accept-ranges", "etag"];
const CACHE_CONTROL = "private, max-age=86400";

const reject = (status: number): Response => new Response(null, { status });

const fetchUpstream = async (start: URL, range: string | null): Promise<Response | null> => {
  let target = start;
  for (let hop = 0; hop <= MAX_MEDIA_REDIRECTS; hop += 1) {
    const upstream = await fetch(target, {
      method: "GET",
      redirect: "manual",
      headers: range ? { range, accept: "image/*,video/*" } : { accept: "image/*,video/*" },
    });
    if (upstream.status < 300 || upstream.status >= 400) return upstream;
    const location = upstream.headers.get("location");
    await upstream.body?.cancel();
    if (!location) return null;
    const next = parseMediaTarget(new URL(location, target).href);
    if (!next) return null;
    target = next;
  }
  return null;
};

export const GET = async (request: Request): Promise<Response> => {
  const { env } = await getCloudflareContext({ async: true });
  const { auth } = createServices(env);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return reject(401);

  const target = parseMediaTarget(new URL(request.url).searchParams.get("u"));
  if (!target) return reject(400);

  let upstream: Response | null;
  try {
    upstream = await fetchUpstream(target, request.headers.get("range"));
  } catch {
    return reject(502);
  }
  if (!upstream) return reject(502);
  if (upstream.status !== 200 && upstream.status !== 206) {
    await upstream.body?.cancel();
    return reject(upstream.status === 404 || upstream.status === 410 ? 404 : 502);
  }
  if (!isAllowedMediaType(upstream.headers.get("content-type"))) {
    await upstream.body?.cancel();
    return reject(415);
  }

  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("cache-control", CACHE_CONTROL);
  headers.set("cross-origin-resource-policy", "same-origin");
  headers.set("x-content-type-options", "nosniff");
  headers.set("vary", "cookie, range");
  return new Response(upstream.body, { status: upstream.status, headers });
};

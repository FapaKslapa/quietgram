import type { Db } from "@nodistraction/db";
import { z } from "zod";
import { redeemPairingToken, savePairedSession } from "@/lib/auth/pairing";

const pairBodySchema = z.compile(
  z.object({
    token: z.string().min(1),
    sessionId: z.string().min(1),
    csrfToken: z.string().min(1),
    userId: z.string().regex(/^\d+$/),
  }),
);

const EXTENSION_ORIGIN = /^(chrome|moz)-extension:\/\//;

export type PairDeps = {
  db: Db;
  cookieKey: string;
  now: Date;
  handOffSession?: ((igUserId: string, sessionId: string) => Promise<void>) | null;
};

const corsHeaders = (origin: string | null): Record<string, string> =>
  origin
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        vary: "origin",
      }
    : {};

const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

export const handlePair = async (request: Request, deps: PairDeps): Promise<Response> => {
  const origin = request.headers.get("origin");
  if (origin !== null && !EXTENSION_ORIGIN.test(origin)) {
    return new Response(null, { status: 403 });
  }
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const parsed = pairBodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400, headers });
  }

  const { token, ...cookies } = parsed.data;
  const ownerId = await redeemPairingToken(deps.db, token, deps.now);
  if (ownerId === null) {
    return Response.json({ error: "invalid_token" }, { status: 401, headers });
  }

  await savePairedSession(deps.db, deps.cookieKey, ownerId, cookies, deps.now);
  await deps.handOffSession?.(cookies.userId, cookies.sessionId).catch(() => undefined);
  return Response.json({ ok: true }, { headers });
};

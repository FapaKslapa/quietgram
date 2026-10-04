import { type Db, igSessions, pairingTokens } from "@nodistraction/db";
import type { IgCookies } from "@nodistraction/ig";
import { and, eq, gt, isNull } from "drizzle-orm";
import { encrypt } from "@/lib/auth/crypto";

const TOKEN_TTL_MS = 10 * 60_000;

const hashToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const issuePairingToken = async (db: Db, userId: string, now: Date): Promise<string> => {
  const token = crypto.randomUUID();
  await db.insert(pairingTokens).values({
    tokenHash: await hashToken(token),
    userId,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
  });
  return token;
};

export const redeemPairingToken = async (
  db: Db,
  token: string,
  now: Date,
): Promise<string | null> => {
  const [redeemed] = await db
    .update(pairingTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(pairingTokens.tokenHash, await hashToken(token)),
        isNull(pairingTokens.usedAt),
        gt(pairingTokens.expiresAt, now),
      ),
    )
    .returning({ userId: pairingTokens.userId });
  return redeemed?.userId ?? null;
};

export const savePairedSession = async (
  db: Db,
  cookieKey: string,
  userId: string,
  cookies: IgCookies,
  now: Date,
): Promise<void> => {
  const { cipher, iv } = await encrypt(JSON.stringify(cookies), cookieKey);
  const values = {
    igUserId: cookies.userId,
    cipher,
    iv,
    status: "active" as const,
    updatedAt: now,
  };
  await db
    .insert(igSessions)
    .values({ ownerId: userId, ...values })
    .onConflictDoUpdate({ target: igSessions.ownerId, set: values });
};

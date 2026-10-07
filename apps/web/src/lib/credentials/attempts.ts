import { type Db, igCredentials } from "@nodistraction/db";
import { and, eq, isNull, lt, lte, or, sql } from "drizzle-orm";

export const ATTEMPT_SPACING_MS = 30 * 60_000;
export const ATTEMPT_WINDOW_MS = 24 * 3_600_000;
export const MAX_ATTEMPTS_PER_WINDOW = 3;

export const claimLoginAttempt = async (db: Db, ownerId: string, now: Date): Promise<boolean> => {
  const nowMs = now.getTime();
  const windowCutoff = nowMs - ATTEMPT_WINDOW_MS;
  const c = igCredentials;
  const windowOpen = sql`${c.windowStartedAt} is null or ${c.windowStartedAt} <= ${windowCutoff}`;
  const claimed = await db
    .update(c)
    .set({
      lastAttemptAt: now,
      windowStartedAt: sql`case when ${windowOpen} then ${nowMs} else ${c.windowStartedAt} end`,
      windowAttempts: sql`case when ${windowOpen} then 1 else ${c.windowAttempts} + 1 end`,
    })
    .where(
      and(
        eq(c.ownerId, ownerId),
        or(isNull(c.lastAttemptAt), lte(c.lastAttemptAt, new Date(nowMs - ATTEMPT_SPACING_MS))),
        or(
          isNull(c.windowStartedAt),
          lte(c.windowStartedAt, new Date(windowCutoff)),
          lt(c.windowAttempts, MAX_ATTEMPTS_PER_WINDOW),
        ),
      ),
    )
    .returning({ ownerId: c.ownerId });
  return claimed.length > 0;
};

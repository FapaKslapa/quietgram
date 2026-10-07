import { type BatchStatement, following, runBatch } from "@nodistraction/db";
import { IgHttpError, SessionExpiredError } from "@nodistraction/ig";
import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import { ZodError } from "zod";
import type { SyncDeps } from "@/lib/sync/deps";
import type { InstagramSource } from "@/lib/sync/source";

export const COUNTS_PER_STEP = 3;
export const COUNTS_MAX_AGE_MS = 7 * 24 * 60 * 60_000;

export const refreshCounts = async (
  deps: SyncDeps,
  ownerId: string,
  source: InstagramSource,
): Promise<void> => {
  const staleBefore = new Date(deps.now().getTime() - COUNTS_MAX_AGE_MS);
  const due = await deps.db
    .select({ igUserId: following.igUserId })
    .from(following)
    .where(
      and(
        eq(following.ownerId, ownerId),
        eq(following.isVerified, false),
        or(isNull(following.countsRefreshedAt), lt(following.countsRefreshedAt, staleBefore)),
      ),
    )
    .orderBy(asc(following.countsRefreshedAt))
    .limit(COUNTS_PER_STEP);

  const updates: BatchStatement[] = [];
  try {
    for (const entry of due) {
      const counts = await source.userCounts(entry.igUserId);
      if (counts === null) break;
      updates.push(
        deps.db
          .update(following)
          .set({ ...counts, countsRefreshedAt: deps.now() })
          .where(and(eq(following.ownerId, ownerId), eq(following.igUserId, entry.igUserId))),
      );
    }
  } catch (error) {
    if (
      !(
        error instanceof IgHttpError ||
        error instanceof SessionExpiredError ||
        error instanceof ZodError
      )
    ) {
      throw error;
    }
  } finally {
    await runBatch(deps.db, updates);
  }
};

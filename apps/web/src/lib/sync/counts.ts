import { following } from "@nodistraction/db";
import {
  fetchUserCounts,
  IgHttpError,
  type Requester,
  SessionExpiredError,
} from "@nodistraction/ig";
import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import { ZodError } from "zod";
import type { SyncDeps } from "@/lib/sync/deps";

export const COUNTS_PER_STEP = 5;
export const COUNTS_MAX_AGE_MS = 7 * 24 * 60 * 60_000;

export const refreshCounts = async (
  deps: SyncDeps,
  ownerId: string,
  requester: Requester,
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

  for (const entry of due) {
    try {
      const counts = await fetchUserCounts(requester, entry.igUserId);
      await deps.db
        .update(following)
        .set({ ...counts, countsRefreshedAt: deps.now() })
        .where(and(eq(following.ownerId, ownerId), eq(following.igUserId, entry.igUserId)));
    } catch (error) {
      if (
        error instanceof IgHttpError ||
        error instanceof SessionExpiredError ||
        error instanceof ZodError
      ) {
        return;
      }
      throw error;
    }
  }
};

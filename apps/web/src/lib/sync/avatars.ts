import { type Db, following, runBatch } from "@nodistraction/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { chunkRows } from "@/lib/sync/chunk";
import { AVATAR_MAX_AGE_MS } from "@/lib/sync/cooldown";

export type AvatarSample = { userId: string; username: string; avatarUrl: string | null };

export const refreshStaleAvatars = async (
  db: Db,
  ownerId: string,
  samples: AvatarSample[],
  now: Date,
): Promise<void> => {
  const fresh = samples.filter((sample) => sample.avatarUrl !== null);
  if (fresh.length === 0) return;
  const rows = await db
    .select({ igUserId: following.igUserId, refreshedAt: following.avatarRefreshedAt })
    .from(following)
    .where(
      and(
        eq(following.ownerId, ownerId),
        inArray(
          following.igUserId,
          fresh.map((sample) => sample.userId),
        ),
      ),
    );
  const staleIds = new Set(
    rows
      .filter(
        (row) =>
          row.refreshedAt === null || now.getTime() - row.refreshedAt.getTime() > AVATAR_MAX_AGE_MS,
      )
      .map((row) => row.igUserId),
  );
  const stale = fresh.filter((sample) => staleIds.has(sample.userId));
  await runBatch(
    db,
    chunkRows(stale, 5).map((group) =>
      db
        .insert(following)
        .values(
          group.map((sample) => ({
            ownerId,
            igUserId: sample.userId,
            username: sample.username,
            avatarUrl: sample.avatarUrl,
            avatarRefreshedAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: [following.ownerId, following.igUserId],
          set: {
            avatarUrl: sql`excluded.avatar_url`,
            avatarRefreshedAt: sql`excluded.avatar_refreshed_at`,
          },
        }),
    ),
  );
};

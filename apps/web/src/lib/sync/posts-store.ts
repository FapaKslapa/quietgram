import { type BatchStatement, posts, runBatch } from "@nodistraction/db";
import type { IgPost } from "@nodistraction/ig";
import { and, eq, inArray } from "drizzle-orm";
import { chunk, chunkRows } from "@/lib/sync/chunk";
import type { SyncDeps } from "@/lib/sync/deps";
import { loadSettings, recencyCutoff } from "@/lib/sync/settings";

const findStoredIds = async (
  deps: SyncDeps,
  ownerId: string,
  ids: string[],
): Promise<Set<string>> => {
  const stored = new Set<string>();
  for (const group of chunk(ids, 90)) {
    const rows = await deps.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.ownerId, ownerId), inArray(posts.id, group)));
    for (const row of rows) stored.add(row.id);
  }
  return stored;
};

export const storePosts = async (
  deps: SyncDeps,
  ownerId: string,
  incoming: IgPost[],
  alongside: BatchStatement[] = [],
): Promise<{ alreadyStored: number }> => {
  const { recencyDays } = await loadSettings(deps.db, ownerId);
  const cutoff = recencyCutoff(deps.now(), recencyDays);
  const recent = incoming.filter((post) => post.takenAt >= cutoff);
  const stored = await findStoredIds(
    deps,
    ownerId,
    recent.map((post) => post.id),
  );
  const fresh = recent.filter((post) => !stored.has(post.id));
  await runBatch(deps.db, [
    ...chunkRows(fresh, 9).map((rows) =>
      deps.db
        .insert(posts)
        .values(
          rows.map((post) => ({
            id: post.id,
            shortcode: post.code,
            productType: post.productType,
            ownerId,
            authorId: post.authorId,
            authorUsername: post.authorUsername,
            caption: post.caption,
            takenAt: new Date(post.takenAt),
            mediaJson: JSON.stringify(post.media),
          })),
        )
        .onConflictDoNothing(),
    ),
    ...alongside,
  ]);
  return { alreadyStored: stored.size };
};

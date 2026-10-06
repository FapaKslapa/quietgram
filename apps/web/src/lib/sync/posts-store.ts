import { posts } from "@nodistraction/db";
import type { IgPost } from "@nodistraction/ig";
import { and, eq, inArray } from "drizzle-orm";
import { chunk, chunkRows } from "@/lib/sync/chunk";
import type { SyncDeps } from "@/lib/sync/deps";

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
): Promise<{ alreadyStored: number }> => {
  const stored = await findStoredIds(
    deps,
    ownerId,
    incoming.map((post) => post.id),
  );
  const fresh = incoming.filter((post) => !stored.has(post.id));
  for (const rows of chunkRows(fresh, 7)) {
    await deps.db
      .insert(posts)
      .values(
        rows.map((post) => ({
          id: post.id,
          ownerId,
          authorId: post.authorId,
          authorUsername: post.authorUsername,
          caption: post.caption,
          takenAt: new Date(post.takenAt),
          mediaJson: JSON.stringify(post.media),
        })),
      )
      .onConflictDoNothing();
  }
  return { alreadyStored: stored.size };
};

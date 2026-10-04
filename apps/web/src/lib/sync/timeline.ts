import { posts } from "@nodistraction/db";
import { fetchTimelinePage, filterByAuthors, type Requester } from "@nodistraction/ig";
import { and, eq, inArray } from "drizzle-orm";
import { chunk, chunkRows } from "@/lib/sync/chunk";
import type { SyncDeps } from "@/lib/sync/deps";
import type { FeedMode } from "@/lib/sync/feed-mode";
import { afterTimeline, MAX_TIMELINE_PAGES, type RunState } from "@/lib/sync/run-state";
import { loadAllowedAuthors } from "@/lib/sync/settings";

type TimelineState = Extract<RunState, { phase: "timeline" }>;

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

export const stepTimeline = async (
  deps: SyncDeps,
  ownerId: string,
  requester: Requester,
  state: TimelineState,
  mode: FeedMode,
): Promise<RunState | null> => {
  const allowed = await loadAllowedAuthors(deps.db, ownerId);
  if (allowed.size === 0) return afterTimeline(mode);

  const page = await fetchTimelinePage(requester, state.cursor ?? undefined);
  const wanted = filterByAuthors(page.posts, allowed);
  const stored = await findStoredIds(
    deps,
    ownerId,
    wanted.map((post) => post.id),
  );
  const fresh = wanted.filter((post) => !stored.has(post.id));

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

  const nextPage = state.page + 1;
  const exhausted = stored.size > 0 || page.nextCursor === null || nextPage >= MAX_TIMELINE_PAGES;
  return exhausted
    ? afterTimeline(mode)
    : { phase: "timeline", cursor: page.nextCursor, page: nextPage };
};

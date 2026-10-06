import { filterByAuthors } from "@nodistraction/ig";
import type { SyncDeps } from "@/lib/sync/deps";
import type { FeedMode } from "@/lib/sync/feed-mode";
import { storePosts } from "@/lib/sync/posts-store";
import { afterTimeline, MAX_TIMELINE_PAGES, type RunState } from "@/lib/sync/run-state";
import { loadAllowedAuthors } from "@/lib/sync/settings";
import type { InstagramSource } from "@/lib/sync/source";

type TimelineState = Extract<RunState, { phase: "timeline" }>;

export const stepTimeline = async (
  deps: SyncDeps,
  ownerId: string,
  source: InstagramSource,
  state: TimelineState,
  mode: FeedMode,
): Promise<RunState | null> => {
  const allowed = await loadAllowedAuthors(deps.db, ownerId);
  if (allowed.size === 0) return afterTimeline(mode, source.kind);

  const page = await source.timelinePage(state.cursor ?? undefined);
  const { alreadyStored } = await storePosts(deps, ownerId, filterByAuthors(page.posts, allowed));

  const nextPage = state.page + 1;
  const caughtUp = source.kind === "direct" && alreadyStored > 0;
  const exhausted = caughtUp || page.nextCursor === null || nextPage >= MAX_TIMELINE_PAGES;
  return exhausted
    ? afterTimeline(mode, source.kind)
    : { phase: "timeline", cursor: page.nextCursor, page: nextPage };
};

"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { BudgetLock } from "@/components/posta/budget-lock";
import { FeedEmpty, FeedEnd, FeedMoreError, PostList } from "@/components/posta/feed-states";
import type { FeedPost } from "@/components/posta/post-card";
import { PostSkeleton } from "@/components/posta/post-skeleton";
import { useInView } from "@/hooks/use-in-view";
import { useNow } from "@/hooks/use-now";
import type { ModeDefinition } from "@/lib/feed-modes";
import { nextCursorOf } from "@/lib/feed-query";
import { useTRPC } from "@/trpc/client";

type FeedProps = { mode: ModeDefinition; onOpenModes: () => void };

export function Feed({ mode, onOpenModes }: FeedProps) {
  const now = useNow();
  const trpc = useTRPC();
  const query = useSuspenseInfiniteQuery(
    trpc.feed.list.infiniteQueryOptions({}, { getNextPageParam: nextCursorOf }),
  );
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  const posts = useMemo(() => {
    const unique = new Map<string, FeedPost>();
    for (const page of data.pages) {
      for (const item of page.items) unique.set(item.id, item);
    }
    return [...unique.values()];
  }, [data.pages]);

  const sentinel = useInView(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  });

  const lockedUntil = data.pages[0]?.lockedUntil ?? null;
  if (lockedUntil !== null) return <BudgetLock lockedUntil={lockedUntil} />;

  if (posts.length === 0) return <FeedEmpty onOpenModes={onOpenModes} />;

  return (
    <>
      <PostList posts={posts} now={now} />
      {hasNextPage ? (
        <div key={data.pages.length} ref={sentinel} className="column px-4 pb-4">
          {isFetchNextPageError ? (
            <FeedMoreError onRetry={() => void fetchNextPage()} />
          ) : (
            <PostSkeleton />
          )}
        </div>
      ) : (
        <FeedEnd variant={mode.weave} />
      )}
    </>
  );
}

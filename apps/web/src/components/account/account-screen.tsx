"use client";

import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AccountHeader } from "@/components/account/account-header";
import {
  AccountHeaderSkeleton,
  AccountPostsEmpty,
  AccountPostsError,
  AccountPostsSkeleton,
} from "@/components/account/account-states";
import { useViewer } from "@/components/media/viewer-provider";
import { FeedMoreError } from "@/components/posta/feed-states";
import { SavedTiles } from "@/components/salvati/saved-states";
import { ScreenHeader } from "@/components/shell/screen-header";
import { useInView } from "@/hooks/use-in-view";
import { mergeTiles, tileLabel } from "@/lib/account";
import { instagramUrl } from "@/lib/instagram-link";
import type { SavedItem } from "@/lib/saved-grid";
import { useTRPC } from "@/trpc/client";

const BACK = { href: "/posta", label: "Posta" };

export function AccountScreen({ userId }: { userId: string }) {
  const trpc = useTRPC();
  const viewer = useViewer();
  const { data } = useSuspenseQuery(trpc.profile.get.queryOptions({ userId }));
  const posts = useInfiniteQuery(
    trpc.profile.posts.infiniteQueryOptions(
      { userId },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
  );
  const { profile } = data;
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = posts;

  const tiles = useMemo(
    () => mergeTiles(posts.data?.pages.map((page) => page.posts) ?? []),
    [posts.data],
  );

  const sentinel = useInView(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  });

  const openTile = (item: SavedItem) =>
    viewer.open({
      groupId: item.id,
      items: item.media,
      index: 0,
      username: item.authorUsername,
      caption: item.caption,
      instagramUrl: instagramUrl(item.shortcode, item.productType),
    });

  return (
    <>
      <ScreenHeader title={profile.username} variant="arch" back={BACK} />
      <AccountHeader profile={profile} />
      {posts.isPending ? <AccountPostsSkeleton /> : null}
      {posts.isError && tiles.length === 0 ? (
        <AccountPostsError onRetry={() => void posts.refetch()} />
      ) : null}
      {posts.isSuccess && tiles.length === 0 ? (
        <AccountPostsEmpty isPrivate={profile.isPrivate} />
      ) : null}
      {tiles.length > 0 ? <SavedTiles items={tiles} onOpen={openTile} labelOf={tileLabel} /> : null}
      {hasNextPage ? (
        <div key={posts.data?.pages.length} ref={sentinel} className="column px-4 pb-6">
          {isFetchNextPageError ? (
            <FeedMoreError onRetry={() => void fetchNextPage()} />
          ) : (
            <AccountPostsSkeleton />
          )}
        </div>
      ) : null}
    </>
  );
}

export function AccountSkeleton() {
  return (
    <>
      <ScreenHeader title="Profilo" variant="arch" back={BACK} />
      <AccountHeaderSkeleton />
      <AccountPostsSkeleton />
    </>
  );
}

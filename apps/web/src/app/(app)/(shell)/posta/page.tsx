import type { Metadata } from "next";
import { Suspense } from "react";
import { PostaScreen, PostaSkeleton } from "@/components/posta/posta-screen";
import { nextCursorOf } from "@/lib/feed-query";
import { HydrateClient } from "@/trpc/hydrate-client";
import { prefetch, prefetchInfinite, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Posta" };

export default function PostaPage() {
  prefetch(trpc.settings.get.queryOptions());
  prefetchInfinite(trpc.feed.list.infiniteQueryOptions({}, { getNextPageParam: nextCursorOf }));

  return (
    <HydrateClient>
      <Suspense fallback={<PostaSkeleton />}>
        <PostaScreen />
      </Suspense>
    </HydrateClient>
  );
}

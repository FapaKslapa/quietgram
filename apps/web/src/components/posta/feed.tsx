"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Postmark } from "@/components/brand/postmark";
import { LetterCard, type LetterPost } from "@/components/posta/letter-card";
import { LetterSkeleton } from "@/components/posta/letter-skeleton";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";
import type { ModeDefinition } from "@/lib/feed-modes";
import { nextCursorOf } from "@/lib/feed-query";
import { formatStampDay } from "@/lib/time";
import { useTRPC } from "@/trpc/client";

type FeedProps = { mode: ModeDefinition; onOpenModes: () => void };

export function Feed({ mode, onOpenModes }: FeedProps) {
  const trpc = useTRPC();
  const query = useSuspenseInfiniteQuery(
    trpc.feed.list.infiniteQueryOptions({}, { getNextPageParam: nextCursorOf }),
  );
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  const posts = useMemo(() => {
    const unique = new Map<string, LetterPost>();
    for (const page of data.pages) {
      for (const item of page.items) unique.set(item.id, item);
    }
    return [...unique.values()];
  }, [data.pages]);

  const sentinel = useInView(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  });

  const now = Date.now();
  const stampDay = formatStampDay(now);

  if (posts.length === 0) {
    return (
      <section className="grid justify-items-center gap-2.5 px-8 pt-12 pb-16 text-center text-soft">
        <Postmark top={mode.stamp} bottom={stampDay} variant={mode.weave} className="size-24" />
        <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">La casella è vuota</h2>
        <p className="max-w-[30ch] text-[0.9375rem] text-balance">
          Non ci sono lettere per ora. Ritira la posta oppure cambia cosa vuoi leggere.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenModes}
          className="mt-2 h-11 rounded-full bg-sheet px-5 text-[0.9375rem] font-semibold"
        >
          Cosa vuoi leggere?
        </Button>
      </section>
    );
  }

  return (
    <>
      <div>
        {posts.map((post) => (
          <LetterCard key={post.id} post={post} now={now} />
        ))}
      </div>
      {hasNextPage ? (
        <div key={data.pages.length} ref={sentinel} className="pb-4">
          {isFetchNextPageError ? (
            <div
              role="alert"
              className="grid justify-items-center gap-3 px-8 py-6 text-center text-sm text-soft"
            >
              <p>Non sono riuscito a caricare altre lettere.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void fetchNextPage()}
                className="h-11 rounded-full bg-sheet px-5 font-semibold"
              >
                Riprova
              </Button>
            </div>
          ) : (
            <LetterSkeleton />
          )}
        </div>
      ) : (
        <section className="grid justify-items-center gap-2.5 px-8 pt-6 pb-12 text-center text-soft">
          <Postmark top={mode.stamp} bottom={stampDay} variant={mode.weave} className="size-24" />
          <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">Consegnato</h2>
          <p className="max-w-[30ch] text-[0.9375rem] text-balance">
            Sei in pari. Non ci sono altre lettere per oggi.
          </p>
        </section>
      )}
    </>
  );
}

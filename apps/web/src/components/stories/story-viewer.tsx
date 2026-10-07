"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StoryFrame } from "@/components/stories/story-frame";
import { Button } from "@/components/ui/button";
import {
  liveItems,
  nextCursor,
  previousCursor,
  type StoryCursor,
  type TrayEntry,
} from "@/lib/stories";
import { useTRPC } from "@/trpc/client";

type StoryViewerProps = { entries: TrayEntry[]; startGroup: number; onClose: () => void };

export function StoryViewer({ entries, startGroup, onClose }: StoryViewerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<StoryCursor>({ group: startGroup, item: 0 });
  const entry = entries[cursor.group];
  const userId = entry?.userId ?? "";
  const stories = useQuery(
    trpc.stories.user.queryOptions({ userId }, { enabled: entry !== undefined }),
  );
  const items = useMemo(
    () => (stories.data ? liveItems(stories.data, Date.now()) : null),
    [stories.data],
  );
  const upcoming = entries[cursor.group + 1];

  useEffect(() => {
    if (!upcoming) return;
    void queryClient.prefetchQuery(trpc.stories.user.queryOptions({ userId: upcoming.userId }));
  }, [upcoming, queryClient, trpc]);

  const advance = useCallback(() => {
    const itemCount = items?.length ?? 0;
    const target = nextCursor(cursor, itemCount, entries.length);
    if (target) setCursor(target);
    else onClose();
  }, [cursor, items, entries.length, onClose]);

  const back = useCallback(() => setCursor((current) => previousCursor(current)), []);

  useEffect(() => {
    if (items && items.length === 0) advance();
  }, [items, advance]);

  if (!entry) return null;

  if (stories.isError) {
    return (
      <div
        role="alert"
        className="absolute inset-0 grid place-content-center justify-items-center gap-4 bg-black px-8 text-center text-white"
      >
        <p className="text-sm">Non riesco a leggere le storie di {entry.username}.</p>
        <Button type="button" variant="outline" onClick={onClose}>
          Chiudi
        </Button>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <div aria-busy="true" className="absolute inset-0 bg-black" />;
  }

  return (
    <StoryFrame
      key={`${cursor.group}-${items[cursor.item]?.id ?? cursor.item}`}
      username={entry.username}
      avatarUrl={entry.avatarUrl}
      items={items}
      index={Math.min(cursor.item, items.length - 1)}
      now={Date.now()}
      onNext={advance}
      onPrevious={back}
      onClose={onClose}
    />
  );
}

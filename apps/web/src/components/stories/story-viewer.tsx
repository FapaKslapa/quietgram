"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StoryFrame } from "@/components/stories/story-frame";
import { StoryErrorView, StoryLoadingView } from "@/components/stories/story-states";
import { mediaSrc } from "@/lib/media-proxy";
import {
  backTarget,
  liveItems,
  nextCursor,
  type StoryCursor,
  slideDirection,
  type TrayEntry,
  USER_STORIES_STALE_MS,
} from "@/lib/stories";
import { useTRPC } from "@/trpc/client";

type StoryViewerProps = {
  entries: TrayEntry[];
  startGroup: number;
  onClose: () => void;
  onSeen: (entry: TrayEntry) => void;
};

const SLIDE_OFFSET = 28;
const SLIDE = { duration: 0.24, ease: [0.16, 1, 0.3, 1] } as const;

export function StoryViewer({ entries, startGroup, onClose, onSeen }: StoryViewerProps) {
  const trpc = useTRPC();
  const [cursor, setCursor] = useState<StoryCursor>({ group: startGroup, item: 0 });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [restarts, setRestarts] = useState(0);
  const entry = entries[cursor.group];
  const upcoming = entries[cursor.group + 1];
  const stories = useQuery(
    trpc.stories.user.queryOptions(
      { userId: entry?.userId ?? "" },
      { enabled: entry !== undefined, staleTime: USER_STORIES_STALE_MS },
    ),
  );
  const nextStories = useQuery(
    trpc.stories.user.queryOptions(
      { userId: upcoming?.userId ?? "" },
      { enabled: upcoming !== undefined && stories.isSuccess, staleTime: USER_STORIES_STALE_MS },
    ),
  );
  const items = useMemo(
    () => (stories.data ? liveItems(stories.data, Date.now()) : null),
    [stories.data],
  );
  const firstUpcoming = nextStories.data?.[0];

  useEffect(() => {
    if (firstUpcoming?.media.kind !== "image") return;
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    image.src = mediaSrc(firstUpcoming.media.url) ?? firstUpcoming.media.url;
  }, [firstUpcoming]);

  useEffect(() => {
    if (entry && items && items.length > 0) onSeen(entry);
  }, [entry, items, onSeen]);

  const go = useCallback((target: StoryCursor, from: StoryCursor) => {
    setDirection(slideDirection(from.group, target.group));
    setCursor(target);
  }, []);

  const advance = useCallback(() => {
    const target = nextCursor(cursor, items?.length ?? 0, entries.length);
    if (target) go(target, cursor);
    else onClose();
  }, [cursor, items, entries.length, onClose, go]);

  const back = useCallback(() => {
    const target = backTarget(cursor);
    if (target === "restart") setRestarts((current) => current + 1);
    else go(target, cursor);
  }, [cursor, go]);

  useEffect(() => {
    if (items && items.length === 0) advance();
  }, [items, advance]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") advance();
      else if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, advance, back]);

  if (!entry) return null;

  const body = (() => {
    if (stories.isError) {
      return (
        <StoryErrorView
          username={entry.username}
          avatarUrl={entry.avatarUrl}
          message={`Non riesco a leggere le storie di ${entry.username}.`}
          onRetry={() => void stories.refetch()}
          onSkip={upcoming ? advance : undefined}
          onClose={onClose}
        />
      );
    }
    if (!items || items.length === 0) {
      return (
        <StoryLoadingView username={entry.username} avatarUrl={entry.avatarUrl} onClose={onClose} />
      );
    }
    return (
      <StoryFrame
        key={`${cursor.group}-${items[cursor.item]?.id ?? cursor.item}-${restarts}`}
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
  })();

  return (
    <AnimatePresence initial={false}>
      <m.div
        key={cursor.group}
        initial={{ opacity: 0, x: direction * SLIDE_OFFSET }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction * -SLIDE_OFFSET }}
        transition={SLIDE}
        className="absolute inset-0"
      >
        {body}
      </m.div>
    </AnimatePresence>
  );
}

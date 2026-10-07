"use client";

import { useMotionValue } from "motion/react";
import { type ReactNode, useState } from "react";
import { FIRST_POST, POSTS } from "@/app/dev/gallery/fixtures/posts";
import { NOW } from "@/app/dev/gallery/fixtures/time";
import { NEXT_REFRESH_HINT, ReadOnlyCard, RefreshHeader } from "@/app/dev/gallery/frames/shared";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { PostList } from "@/components/posta/feed-states";
import { PullSurface } from "@/components/posta/pull-surface";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PULL_THRESHOLD, type PullPhase } from "@/lib/pull";

const LIVE_PROGRESS = { completed: 7, total: 18, authors: null };
const LIVE_REFRESH_MS = 2200;
const ARMED_DISTANCE = PULL_THRESHOLD + 12;

function PullStatic({ distance, phase }: { distance: number; phase: PullPhase }) {
  const pull = useMotionValue(distance);

  return (
    <PullSurface pull={pull} phase={phase} nextLabel={NEXT_REFRESH_HINT} progress={null}>
      <RefreshHeader hint={null} disabled={false} />
      <PostList posts={FIRST_POST} now={NOW} Card={ReadOnlyCard} />
    </PullSurface>
  );
}

function PullLive(): ReactNode {
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const progress = busy ? LIVE_PROGRESS : null;
  const { pull, phase } = usePullToRefresh({
    enabled: true,
    cooling: false,
    busy,
    onTrigger: () => {
      setBusy(true);
      setCount((current) => current + 1);
      setTimeout(() => setBusy(false), LIVE_REFRESH_MS);
    },
  });

  return (
    <PullSurface pull={pull} phase={phase} nextLabel={NEXT_REFRESH_HINT} progress={progress}>
      <RefreshHeader
        hint={null}
        disabled={busy}
        progress={progress}
        onRefresh={() => setBusy(true)}
      />
      <p data-testid="pull-count" className="sr-only">
        {count}
      </p>
      <PostList posts={POSTS} now={NOW} Card={ReadOnlyCard} />
    </PullSurface>
  );
}

export const PULL_VIEWS = {
  "pull-pulling": () => <PullStatic distance={40} phase="pulling" />,
  "pull-armed": () => <PullStatic distance={ARMED_DISTANCE} phase="armed" />,
  "pull-blocked": () => <PullStatic distance={ARMED_DISTANCE} phase="blocked" />,
  "pull-live": () => <PullLive />,
} satisfies ViewMap;

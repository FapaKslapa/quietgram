"use client";

import { Suspense, useState } from "react";
import { BudgetTracker } from "@/components/posta/budget-tracker";
import { Feed } from "@/components/posta/feed";
import { ModeDrawer } from "@/components/posta/mode-drawer";
import { PostSkeleton } from "@/components/posta/post-skeleton";
import { PostaHeader } from "@/components/posta/posta-header";
import { PullSurface } from "@/components/posta/pull-surface";
import { RefreshPanel } from "@/components/posta/refresh-panel";
import { StoriesBar } from "@/components/stories/stories-bar";
import { useFeedSettings } from "@/hooks/use-feed-settings";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useRefreshController } from "@/hooks/use-refresh-controller";
import { modeDefinition } from "@/lib/feed-modes";

export function PostaScreen() {
  const { settings } = useFeedSettings();
  const [modesOpen, setModesOpen] = useState(false);
  const mode = modeDefinition(settings.feedMode);
  const controller = useRefreshController();
  const busy = controller.progress !== null;
  const { pull, phase } = usePullToRefresh({
    enabled: true,
    cooling: controller.cooling,
    busy,
    onTrigger: controller.refresh,
  });

  return (
    <>
      <PullSurface
        pull={pull}
        phase={phase}
        nextLabel={controller.nextLabel}
        progress={controller.progress}
      >
        <PostaHeader mode={mode} modesOpen={modesOpen} onOpenModes={() => setModesOpen(true)}>
          <RefreshPanel
            hint={controller.hint}
            note={controller.note}
            disabled={controller.cooling || busy}
            progress={controller.progress}
            onRefresh={controller.refresh}
          />
        </PostaHeader>
        <StoriesBar />
        <Suspense fallback={<PostaFeedSkeleton />}>
          <Feed mode={mode} onOpenModes={() => setModesOpen(true)} />
        </Suspense>
      </PullSurface>
      <ModeDrawer open={modesOpen} onOpenChange={setModesOpen} />
      <BudgetTracker />
    </>
  );
}

export function PostaFeedSkeleton() {
  return (
    <div className="column px-4">
      <PostSkeleton />
    </div>
  );
}

export function PostaSkeleton() {
  return (
    <>
      <header>
        <div className="column px-5 pt-8 pb-6">
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Posta</h1>
        </div>
      </header>
      <PostaFeedSkeleton />
    </>
  );
}

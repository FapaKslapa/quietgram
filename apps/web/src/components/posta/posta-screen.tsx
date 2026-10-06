"use client";

import { Suspense, useState } from "react";
import { Feed } from "@/components/posta/feed";
import { ModeDrawer } from "@/components/posta/mode-drawer";
import { PostSkeleton } from "@/components/posta/post-skeleton";
import { PostaHeader } from "@/components/posta/posta-header";
import { RefreshRow } from "@/components/posta/refresh-row";
import { useFeedSettings } from "@/hooks/use-feed-settings";
import { modeDefinition } from "@/lib/feed-modes";

export function PostaScreen() {
  const { settings } = useFeedSettings();
  const [modesOpen, setModesOpen] = useState(false);
  const mode = modeDefinition(settings.feedMode);

  return (
    <>
      <PostaHeader mode={mode} modesOpen={modesOpen} onOpenModes={() => setModesOpen(true)}>
        <RefreshRow />
      </PostaHeader>
      <Suspense fallback={<PostaFeedSkeleton />}>
        <Feed mode={mode} onOpenModes={() => setModesOpen(true)} />
      </Suspense>
      <ModeDrawer open={modesOpen} onOpenChange={setModesOpen} />
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

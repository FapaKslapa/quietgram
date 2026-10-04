"use client";

import { Suspense, useState } from "react";
import { Weave } from "@/components/brand/weave";
import { Feed } from "@/components/posta/feed";
import { LetterSkeleton } from "@/components/posta/letter-skeleton";
import { ModeDrawer } from "@/components/posta/mode-drawer";
import { ModePill } from "@/components/posta/mode-pill";
import { RefreshRow } from "@/components/posta/refresh-row";
import { useFeedSettings } from "@/hooks/use-feed-settings";
import { MODES, modeDefinition } from "@/lib/feed-modes";

export function PostaScreen() {
  const { settings } = useFeedSettings();
  const [modesOpen, setModesOpen] = useState(false);
  const mode = modeDefinition(settings.feedMode);

  return (
    <>
      <header className="relative isolate px-5 pt-7 pb-[18px]">
        {MODES.map((definition) => (
          <Weave
            key={definition.mode}
            variant={definition.weave}
            surface="head"
            active={definition.mode === mode.mode}
          />
        ))}
        <div className="mb-[18px] flex items-center justify-between gap-3">
          <h1 className="text-[2rem] leading-[1.05] font-bold tracking-[-0.035em]">Posta</h1>
          <ModePill label={mode.label} open={modesOpen} onClick={() => setModesOpen(true)} />
        </div>
        <RefreshRow />
      </header>
      <Suspense fallback={<LetterSkeleton />}>
        <Feed mode={mode} onOpenModes={() => setModesOpen(true)} />
      </Suspense>
      <ModeDrawer open={modesOpen} onOpenChange={setModesOpen} />
    </>
  );
}

export function PostaSkeleton() {
  return (
    <>
      <header className="px-5 pt-7 pb-[18px]">
        <h1 className="text-[2rem] leading-[1.05] font-bold tracking-[-0.035em]">Posta</h1>
      </header>
      <LetterSkeleton />
      <LetterSkeleton />
    </>
  );
}

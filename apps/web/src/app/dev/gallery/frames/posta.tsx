"use client";

import { useState } from "react";
import { POSTS } from "@/app/dev/gallery/fixtures/posts";
import { SETTINGS } from "@/app/dev/gallery/fixtures/settings";
import { TRAY } from "@/app/dev/gallery/fixtures/stories";
import { NOW } from "@/app/dev/gallery/fixtures/time";
import { InteractiveCard, ReadOnlyCard } from "@/app/dev/gallery/frames/cards";
import { noop } from "@/app/dev/gallery/frames/helpers";
import { RefreshHeader } from "@/app/dev/gallery/frames/refresh-header";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { BudgetLockView } from "@/components/posta/budget-lock-view";
import { FeedEmpty, FeedEnd, PostList } from "@/components/posta/feed-states";
import { type ModeSettings, ModeSheet } from "@/components/posta/mode-sheet";
import { PostaFeedSkeleton } from "@/components/posta/posta-screen";
import { MediaTone } from "@/components/shell/media-tone";
import { TabBarView } from "@/components/shell/tab-bar-view";
import { StoriesBarView } from "@/components/stories/stories-bar-view";
import { BACKOFF_NOTE } from "@/lib/credentials/copy";
import { modeDefinition } from "@/lib/feed-modes";

const RUNNING_PROGRESS = { completed: 7, total: 18, authors: { checked: 24, total: 1000 } };

type PostaFrameProps = {
  settings?: ModeSettings;
  openModes?: boolean;
  running?: boolean;
  backoff?: boolean;
  empty?: boolean;
  loading?: boolean;
  stories?: boolean;
  interactive?: boolean;
};

function PostaFrame({
  settings: initial = SETTINGS,
  openModes = false,
  running = false,
  backoff = false,
  empty = false,
  loading = false,
  stories = false,
  interactive = false,
}: PostaFrameProps) {
  const [settings, setSettings] = useState(initial);
  const [open, setOpen] = useState(openModes);
  const mode = modeDefinition(settings.feedMode);

  return (
    <>
      <RefreshHeader
        mode={settings.feedMode}
        modesOpen={open}
        onOpenModes={() => setOpen(true)}
        progress={running ? RUNNING_PROGRESS : null}
        note={backoff ? BACKOFF_NOTE : null}
        {...(backoff ? { hint: null, disabled: false } : {})}
      />
      {stories ? <StoriesBarView entries={TRAY} onOpen={noop} /> : null}
      {loading ? <PostaFeedSkeleton /> : null}
      {empty ? <FeedEmpty onOpenModes={() => setOpen(true)} /> : null}
      {loading || empty ? null : (
        <>
          <PostList posts={POSTS} now={NOW} Card={interactive ? InteractiveCard : ReadOnlyCard} />
          <FeedEnd variant={mode.weave} />
        </>
      )}
      <TabBarView pathname="/posta" unread />
      <ModeSheet
        open={open}
        onOpenChange={setOpen}
        settings={settings}
        onMode={(feedMode) => setSettings((current) => ({ ...current, feedMode }))}
        onThreshold={(creatorThreshold) =>
          setSettings((current) => ({ ...current, creatorThreshold }))
        }
        onRecency={(recencyDays) => setSettings((current) => ({ ...current, recencyDays }))}
        onAddException={noop}
        onRemoveException={noop}
      />
    </>
  );
}

export const POSTA_VIEWS = {
  posta: () => <PostaFrame />,
  "posta-running": () => <PostaFrame running />,
  "posta-backoff": () => <PostaFrame backoff running />,
  "posta-empty": () => <PostaFrame empty />,
  "posta-loading": () => <PostaFrame loading />,
  "posta-grayscale": () => (
    <>
      <MediaTone grayscale />
      <PostaFrame />
    </>
  ),
  "posta-stories": () => <PostaFrame stories />,
  "posta-interactive": () => <PostaFrame stories interactive />,
  "modes-friends": () => <PostaFrame openModes />,
  "modes-creators": () => <PostaFrame settings={{ ...SETTINGS, feedMode: "creators" }} openModes />,
  "budget-lock": () => <BudgetLockView minutes={15} reopensAt={NOW + 60 * 60_000} />,
} satisfies ViewMap;

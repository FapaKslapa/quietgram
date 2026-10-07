"use client";

import { useState } from "react";
import { FIRST_POST } from "@/app/dev/gallery/fixtures/posts";
import { STORY_ITEMS, TRAY } from "@/app/dev/gallery/fixtures/stories";
import { NOW } from "@/app/dev/gallery/fixtures/time";
import { ReadOnlyCard } from "@/app/dev/gallery/frames/cards";
import { noop } from "@/app/dev/gallery/frames/helpers";
import { RefreshHeader } from "@/app/dev/gallery/frames/refresh-header";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { PostList } from "@/components/posta/feed-states";
import { MediaTone } from "@/components/shell/media-tone";
import { TabBarView } from "@/components/shell/tab-bar-view";
import { StoriesBarMessage, StoriesBarSkeleton } from "@/components/stories/stories-bar-view";
import { StoryFrame } from "@/components/stories/story-frame";
import { StoryErrorView, StoryLoadingView } from "@/components/stories/story-states";

const USERNAME = "giulia.r";
const AVATAR_URL = TRAY[0]?.avatarUrl ?? null;

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[70] bg-black text-white">{children}</div>;
}

function StoryDemo({ video = false }: { video?: boolean }) {
  const [index, setIndex] = useState(0);
  const items = video
    ? STORY_ITEMS.map((item, position) =>
        position === 0 ? { ...item, media: { ...item.media, kind: "video" as const } } : item,
      )
    : STORY_ITEMS;

  return (
    <FullScreen>
      <StoryFrame
        key={index}
        username={USERNAME}
        avatarUrl={AVATAR_URL}
        items={items}
        index={index}
        now={NOW}
        onNext={() => setIndex((current) => Math.min(current + 1, items.length - 1))}
        onPrevious={() => setIndex((current) => Math.max(current - 1, 0))}
        onClose={noop}
      />
    </FullScreen>
  );
}

function StoriesBarFrame({ variant }: { variant: "loading" | "empty" }) {
  return (
    <>
      <RefreshHeader />
      {variant === "loading" ? (
        <StoriesBarSkeleton />
      ) : (
        <StoriesBarMessage message="Nessuna storia per ora" onRetry={noop} retrying={false} />
      )}
      <PostList posts={FIRST_POST} now={NOW} Card={ReadOnlyCard} />
      <TabBarView pathname="/posta" unread />
    </>
  );
}

function StoryStateFrame({ error = false }: { error?: boolean }) {
  return (
    <FullScreen>
      {error ? (
        <StoryErrorView
          username={USERNAME}
          avatarUrl={AVATAR_URL}
          message="Non riesco a leggere le storie di giulia.r."
          onRetry={noop}
          onSkip={noop}
          onClose={noop}
        />
      ) : (
        <StoryLoadingView username={USERNAME} avatarUrl={AVATAR_URL} onClose={noop} />
      )}
    </FullScreen>
  );
}

export const STORIES_VIEWS = {
  "stories-loading": () => <StoriesBarFrame variant="loading" />,
  "stories-empty": () => <StoriesBarFrame variant="empty" />,
  "story-viewer-loading": () => <StoryStateFrame />,
  "story-viewer-error": () => <StoryStateFrame error />,
  "story-viewer": () => <StoryDemo />,
  "story-viewer-gray": () => (
    <>
      <MediaTone grayscale />
      <StoryDemo />
    </>
  ),
  "story-viewer-video": () => <StoryDemo video />,
} satisfies ViewMap;

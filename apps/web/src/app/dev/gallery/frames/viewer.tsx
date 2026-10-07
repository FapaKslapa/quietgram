"use client";

import { CAROUSEL_POST, POSTS } from "@/app/dev/gallery/fixtures/posts";
import { NOW } from "@/app/dev/gallery/fixtures/time";
import { ReadOnlyCard } from "@/app/dev/gallery/frames/cards";
import { linkedViewerRequest, useOpenViewer } from "@/app/dev/gallery/frames/helpers";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { PostList } from "@/components/posta/feed-states";

const TARGET = POSTS[1];
const REQUEST = TARGET ? linkedViewerRequest(TARGET, 1) : null;

function CarouselFrame() {
  return <PostList posts={CAROUSEL_POST} now={NOW} Card={ReadOnlyCard} />;
}

function ViewerFrame() {
  useOpenViewer(REQUEST);
  return <CarouselFrame />;
}

export const VIEWER_VIEWS = {
  carousel: () => <CarouselFrame />,
  viewer: () => <ViewerFrame />,
} satisfies ViewMap;

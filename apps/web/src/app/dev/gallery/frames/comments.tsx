"use client";

import { useState } from "react";
import { COMMENTS } from "@/app/dev/gallery/fixtures/comments";
import { FIRST_POST } from "@/app/dev/gallery/fixtures/posts";
import { NOW } from "@/app/dev/gallery/fixtures/time";
import { InteractiveCard, noop } from "@/app/dev/gallery/frames/shared";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { CommentsSheet, type CommentsState } from "@/components/posta/comments-sheet";
import { PostList } from "@/components/posta/feed-states";

function CommentsFrame({ state, enabled }: { state: CommentsState; enabled: boolean }) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <PostList posts={FIRST_POST} now={NOW} Card={InteractiveCard} />
      <CommentsSheet
        open={open}
        onOpenChange={setOpen}
        state={state}
        rows={state === "ready" ? COMMENTS : []}
        now={NOW}
        composerEnabled={enabled}
        onSubmit={noop}
        onRetry={noop}
      />
    </>
  );
}

export const COMMENTS_VIEWS = {
  comments: () => <CommentsFrame state="ready" enabled />,
  "comments-readonly": () => <CommentsFrame state="ready" enabled={false} />,
  "comments-loading": () => <CommentsFrame state="loading" enabled />,
  "comments-error": () => <CommentsFrame state="error" enabled />,
} satisfies ViewMap;

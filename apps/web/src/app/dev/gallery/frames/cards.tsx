"use client";

import { useState } from "react";
import { COMMENTS } from "@/app/dev/gallery/fixtures/comments";
import { NOW } from "@/app/dev/gallery/fixtures/time";
import { noop } from "@/app/dev/gallery/frames/helpers";
import { CommentsSheet } from "@/components/posta/comments-sheet";
import { type FeedPost, PostCardView } from "@/components/posta/post-card";
import { applyAction, type PostFlags, toggleAction } from "@/lib/interactions";

export function InteractiveCard({ post, now }: { post: FeedPost; now: number }) {
  const [flags, setFlags] = useState<PostFlags>({ liked: post.liked, saved: post.saved });
  const [comments, setComments] = useState(false);

  return (
    <PostCardView
      post={post}
      now={now}
      flags={flags}
      interactionsEnabled
      onLike={() => setFlags((current) => applyAction(current, "like"))}
      onToggleLike={() =>
        setFlags((current) => applyAction(current, toggleAction(current, "like")))
      }
      onToggleSave={() =>
        setFlags((current) => applyAction(current, toggleAction(current, "save")))
      }
      onOpenComments={() => setComments(true)}
    >
      <CommentsSheet
        open={comments}
        onOpenChange={setComments}
        state="ready"
        rows={COMMENTS}
        now={NOW}
        composerEnabled
        onSubmit={noop}
        onRetry={noop}
      />
    </PostCardView>
  );
}

export function ReadOnlyCard({ post, now }: { post: FeedPost; now: number }) {
  return (
    <PostCardView
      post={post}
      now={now}
      flags={{ liked: post.liked, saved: post.saved }}
      interactionsEnabled={false}
      onLike={noop}
      onToggleLike={noop}
      onToggleSave={noop}
      onOpenComments={noop}
    />
  );
}

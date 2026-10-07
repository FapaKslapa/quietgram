"use client";

import { useEffect, useState } from "react";
import { COMMENTS } from "@/app/dev/gallery/fixtures/comments";
import { NOW } from "@/app/dev/gallery/fixtures/time";
import type { ViewerRequest } from "@/components/media/viewer-layer";
import { useViewer } from "@/components/media/viewer-provider";
import { CommentsSheet } from "@/components/posta/comments-sheet";
import { type FeedPost, PostCardView } from "@/components/posta/post-card";
import { PostaHeader } from "@/components/posta/posta-header";
import { RefreshPanel } from "@/components/posta/refresh-panel";
import type { RefreshProgress } from "@/hooks/use-refresh";
import { type FeedMode, modeDefinition } from "@/lib/feed-modes";
import { instagramUrl } from "@/lib/instagram-link";
import { applyAction, type PostFlags, toggleAction } from "@/lib/interactions";
import type { PostMediaItem } from "@/lib/media";

export const noop = () => undefined;
export const sendNothing = async () => true;

export const NEXT_REFRESH_HINT = "Prossimo aggiornamento dalle 14:51";

type Showable = {
  id: string;
  media: PostMediaItem[];
  authorUsername: string;
  caption: string | null;
};

type Linkable = Showable & {
  shortcode?: string | null | undefined;
  productType?: string | null | undefined;
};

export const viewerRequest = (item: Showable, index = 0): ViewerRequest => ({
  groupId: item.id,
  items: item.media,
  index,
  username: item.authorUsername,
  caption: item.caption,
});

export const linkedViewerRequest = (item: Linkable, index = 0): ViewerRequest => ({
  ...viewerRequest(item, index),
  instagramUrl: instagramUrl(item.shortcode, item.productType),
});

export function useOpenViewer(request: ViewerRequest | null): void {
  const viewer = useViewer();

  useEffect(() => {
    if (request) viewer.open(request);
  }, [request, viewer]);
}

type RefreshHeaderProps = {
  hint?: string | null;
  disabled?: boolean;
  progress?: RefreshProgress | null;
  mode?: FeedMode;
  modesOpen?: boolean;
  onOpenModes?: () => void;
  onRefresh?: () => void;
};

export function RefreshHeader({
  hint = NEXT_REFRESH_HINT,
  disabled = true,
  progress = null,
  mode = "friends",
  modesOpen = false,
  onOpenModes = noop,
  onRefresh = noop,
}: RefreshHeaderProps) {
  return (
    <PostaHeader mode={modeDefinition(mode)} modesOpen={modesOpen} onOpenModes={onOpenModes}>
      <RefreshPanel hint={hint} disabled={disabled} progress={progress} onRefresh={onRefresh} />
    </PostaHeader>
  );
}

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

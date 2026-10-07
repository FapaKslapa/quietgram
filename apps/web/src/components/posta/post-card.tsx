"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { CommentsDrawer } from "@/components/posta/comments-drawer";
import { PostActions } from "@/components/posta/post-actions";
import { PostCaption } from "@/components/posta/post-caption";
import { PostMedia } from "@/components/posta/post-media";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePostInteractions } from "@/hooks/use-post-interactions";
import { instagramUrl } from "@/lib/instagram-link";
import type { PostFlags } from "@/lib/interactions";
import type { PostMediaItem } from "@/lib/media";
import { formatRelativeTime } from "@/lib/time";
import { useTRPC } from "@/trpc/client";

export type FeedPost = {
  id: string;
  shortcode?: string | null | undefined;
  productType?: string | null | undefined;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  caption: string | null;
  takenAt: number;
  liked: boolean;
  saved: boolean;
  media: PostMediaItem[];
};

type PostCardViewProps = {
  post: FeedPost;
  now: number;
  flags: PostFlags;
  interactionsEnabled: boolean;
  onLike: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onOpenComments: () => void;
  children?: ReactNode;
};

export function PostCardView({
  post,
  now,
  flags,
  interactionsEnabled,
  onLike,
  onToggleLike,
  onToggleSave,
  onOpenComments,
  children,
}: PostCardViewProps) {
  return (
    <article
      className="mb-3 overflow-hidden rounded-lg border bg-card [contain-intrinsic-size:auto_620px] [content-visibility:auto]"
      aria-label={`Post di ${post.authorUsername}`}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Link
          href={`/account/${post.authorId}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md"
        >
          <UserAvatar username={post.authorUsername} avatarUrl={post.authorAvatarUrl} />
          <strong className="min-w-0 flex-1 truncate text-sm font-semibold">
            {post.authorUsername}
          </strong>
        </Link>
        <time
          dateTime={new Date(post.takenAt).toISOString()}
          className="num-display flex-none text-xs text-muted-foreground"
          suppressHydrationWarning
        >
          {formatRelativeTime(post.takenAt, now)}
        </time>
      </div>
      <PostMedia
        media={post.media}
        username={post.authorUsername}
        groupId={post.id}
        caption={post.caption}
        instagramUrl={instagramUrl(post.shortcode, post.productType)}
        {...(interactionsEnabled ? { onDoubleTap: onLike } : {})}
      />
      <PostActions
        flags={flags}
        enabled={interactionsEnabled}
        onLike={onToggleLike}
        onSave={onToggleSave}
        onComments={onOpenComments}
      />
      {post.caption ? (
        <PostCaption username={post.authorUsername} caption={post.caption} />
      ) : (
        <div className="h-3" />
      )}
      {children}
    </article>
  );
}

type PostCardProps = { post: FeedPost; now: number };

export function PostCard({ post, now }: PostCardProps) {
  const trpc = useTRPC();
  const { data: interactionsEnabled = false } = useQuery(
    trpc.settings.get.queryOptions(undefined, {
      select: (settings) => settings.interactionsEnabled,
    }),
  );
  const { flags, toggle, likeOnce } = usePostInteractions(post.id, {
    liked: post.liked,
    saved: post.saved,
  });
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <PostCardView
      post={post}
      now={now}
      flags={flags}
      interactionsEnabled={interactionsEnabled}
      onLike={likeOnce}
      onToggleLike={() => toggle("like")}
      onToggleSave={() => toggle("save")}
      onOpenComments={() => setCommentsOpen(true)}
    >
      <CommentsDrawer
        mediaId={post.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        composerEnabled={interactionsEnabled}
      />
    </PostCardView>
  );
}

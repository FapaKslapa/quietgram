import { AuthorAvatar } from "@/components/posta/author-avatar";
import { PostCaption } from "@/components/posta/post-caption";
import { PostMedia } from "@/components/posta/post-media";
import { instagramUrl } from "@/lib/instagram-link";
import type { PostMediaItem } from "@/lib/media";
import { formatRelativeTime } from "@/lib/time";

export type FeedPost = {
  id: string;
  shortcode?: string | null | undefined;
  productType?: string | null | undefined;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  caption: string | null;
  takenAt: number;
  media: PostMediaItem[];
};

type PostCardProps = { post: FeedPost; now: number };

export function PostCard({ post, now }: PostCardProps) {
  return (
    <article
      className="mb-3 overflow-hidden rounded-lg border bg-card [contain-intrinsic-size:auto_560px] [content-visibility:auto]"
      aria-label={`Post di ${post.authorUsername}`}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <AuthorAvatar username={post.authorUsername} avatarUrl={post.authorAvatarUrl} />
        <strong className="min-w-0 flex-1 truncate text-sm font-semibold">
          {post.authorUsername}
        </strong>
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
      />
      {post.caption ? (
        <PostCaption username={post.authorUsername} caption={post.caption} />
      ) : (
        <div className="h-3" />
      )}
    </article>
  );
}

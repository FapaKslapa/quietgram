import { Weave } from "@/components/brand/weave";
import { AuthorAvatar } from "@/components/posta/author-avatar";
import { LetterCaption } from "@/components/posta/letter-caption";
import { LetterMedia, type LetterMediaItem } from "@/components/posta/letter-media";
import { formatRelativeTime } from "@/lib/time";
import { pickWeave } from "@/lib/weave";

export type LetterPost = {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  caption: string | null;
  takenAt: number;
  media: LetterMediaItem[];
};

type LetterCardProps = { post: LetterPost; now: number };

export function LetterCard({ post, now }: LetterCardProps) {
  return (
    <article
      className="relative isolate mx-3 mb-4 overflow-hidden rounded-[28px] bg-sheet shadow-(--shadow-letter) [content-visibility:auto] [contain-intrinsic-size:auto_560px]"
      aria-label={`Lettera di ${post.authorUsername}`}
    >
      <Weave variant={pickWeave(post.authorId)} surface="card" />
      <div className="flex items-center gap-3 px-[18px] pt-4 pb-3">
        <AuthorAvatar
          authorId={post.authorId}
          username={post.authorUsername}
          avatarUrl={post.authorAvatarUrl}
        />
        <div className="min-w-0 flex-1">
          <strong className="block truncate leading-tight font-semibold">
            {post.authorUsername}
          </strong>
          <time
            dateTime={new Date(post.takenAt).toISOString()}
            className="num text-xs text-soft"
            suppressHydrationWarning
          >
            {formatRelativeTime(post.takenAt, now)}
          </time>
        </div>
      </div>
      <LetterMedia media={post.media} username={post.authorUsername} />
      {post.caption ? (
        <LetterCaption username={post.authorUsername} caption={post.caption} />
      ) : (
        <div className="h-4" />
      )}
    </article>
  );
}

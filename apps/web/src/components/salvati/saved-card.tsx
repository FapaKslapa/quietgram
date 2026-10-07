import { Images, Play } from "lucide-react";
import { motion } from "motion/react";
import { LazyImage } from "@/components/media/lazy-image";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { PostMediaItem } from "@/lib/media";
import { mediaSrc } from "@/lib/media-proxy";
import { badgeOf, coverOf, type SavedItem, savedLabel } from "@/lib/saved-grid";

function Cover({
  media,
  username,
  layoutId,
}: {
  media: PostMediaItem;
  username: string;
  layoutId: string;
}) {
  if (media.kind === "video") {
    return (
      <video
        src={`${mediaSrc(media.url) ?? ""}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        className="size-full object-cover"
      />
    );
  }
  return (
    <motion.div layoutId={layoutId} className="size-full">
      <LazyImage
        src={media.url}
        alt={`Foto di ${username}`}
        width={media.width}
        height={media.height}
      />
    </motion.div>
  );
}

type SavedCardProps = {
  item: SavedItem;
  onOpen: (item: SavedItem) => void;
  label?: string | undefined;
};

export function SavedCard({ item, onOpen, label }: SavedCardProps) {
  const cover = coverOf(item);
  const badge = badgeOf(item);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={label ?? savedLabel(item)}
      className="group relative block aspect-4/5 w-full overflow-hidden rounded-md bg-muted text-left [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      {cover ? (
        <Cover media={cover} username={item.authorUsername} layoutId={`${item.id}-0`} />
      ) : null}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/10 group-active:bg-foreground/15"
      />
      {item.authorAvatarUrl !== undefined ? (
        <UserAvatar
          username={item.authorUsername}
          avatarUrl={item.authorAvatarUrl}
          className="absolute bottom-1.5 left-1.5 size-6 ring-2 ring-background"
        />
      ) : null}
      {badge ? (
        <span
          aria-hidden="true"
          className="num-display absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-[11px] font-semibold text-foreground"
        >
          {badge.kind === "video" ? (
            <Play className="size-3 fill-current" strokeWidth={0} />
          ) : (
            <>
              <Images className="size-3" strokeWidth={2} />
              {badge.count}
            </>
          )}
        </span>
      ) : null}
    </button>
  );
}

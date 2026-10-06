import { Images, Play } from "lucide-react";
import type { PostMediaItem } from "@/components/posta/post-media";
import { badgeOf, coverOf, type SavedItem, savedLabel } from "@/lib/saved-grid";

function Cover({ media, username }: { media: PostMediaItem; username: string }) {
  if (media.kind === "video") {
    return (
      <video
        src={`${media.url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        className="size-full object-cover"
      />
    );
  }
  return (
    <img
      src={media.url}
      alt={`Foto salvata di ${username}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="size-full object-cover"
    />
  );
}

type SavedCardProps = { item: SavedItem; onOpen: (item: SavedItem) => void };

export function SavedCard({ item, onOpen }: SavedCardProps) {
  const cover = coverOf(item);
  const badge = badgeOf(item);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={savedLabel(item)}
      className="group relative block aspect-4/5 w-full overflow-hidden rounded-md bg-muted text-left [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      {cover ? <Cover media={cover} username={item.authorUsername} /> : null}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/10 group-active:bg-foreground/15"
      />
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

import { Images, Play } from "lucide-react";
import type { LetterMediaItem } from "@/components/posta/letter-media";
import { badgeOf, coverOf, type SavedItem, savedLabel } from "@/lib/saved-grid";

function Cover({ media, username }: { media: LetterMediaItem; username: string }) {
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
      className="group block min-w-0 rounded-3xl bg-sheet p-1.5 pb-0 text-left shadow-(--shadow-letter) transition-[transform,box-shadow] duration-300 ease-out-expo [content-visibility:auto] [contain-intrinsic-size:auto_260px] hover:-translate-y-0.5 active:translate-y-0"
    >
      <span className="relative block aspect-4/5 overflow-hidden rounded-[18px] bg-muted">
        {cover ? <Cover media={cover} username={item.authorUsername} /> : null}
        {badge ? (
          <span
            aria-hidden="true"
            className="num absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-xs font-medium text-white"
          >
            {badge.kind === "video" ? (
              <Play className="size-3.5 fill-current" strokeWidth={0} />
            ) : (
              <>
                <Images className="size-3.5" strokeWidth={1.8} />
                {badge.count}
              </>
            )}
          </span>
        ) : null}
      </span>
      <span className="block truncate px-3 pt-2.5 pb-3 text-[0.8125rem] font-medium text-soft">
        {item.authorUsername}
      </span>
    </button>
  );
}

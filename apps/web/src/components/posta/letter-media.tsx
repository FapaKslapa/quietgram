"use client";

import { type KeyboardEvent, useCallback, useRef, useState } from "react";
import { clampIndex, indexFromScroll, mediaAspectRatio } from "@/lib/carousel";
import { cn } from "@/lib/utils";

export type LetterMediaItem = {
  kind: "image" | "video";
  url: string;
  width: number;
  height: number;
};

type LetterMediaProps = { media: LetterMediaItem[]; username: string };

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Slide({ item, label }: { item: LetterMediaItem; label: string }) {
  if (item.kind === "video") {
    return (
      <video
        src={item.url}
        controls
        muted
        playsInline
        preload="metadata"
        aria-label={label}
        className="size-full bg-ink object-cover"
      />
    );
  }
  return (
    <img
      src={item.url}
      alt={label}
      width={item.width}
      height={item.height}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="size-full object-cover"
    />
  );
}

export function LetterMedia({ media, username }: LetterMediaProps) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLUListElement>(null);
  const first = media[0];
  const count = media.length;

  const goTo = useCallback(
    (target: number) => {
      const element = track.current;
      if (!element) return;
      const next = clampIndex(target, count);
      element.scrollTo({
        left: next * element.clientWidth,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    },
    [count],
  );

  if (!first) return null;

  const onScroll = () => {
    const element = track.current;
    if (!element) return;
    setIndex(indexFromScroll(element.scrollLeft, element.clientWidth, count));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(count - 1);
    }
  };

  const aspectRatio = mediaAspectRatio(first.width, first.height);

  return (
    <div className="relative mx-2 overflow-hidden rounded-[22px] bg-muted" style={{ aspectRatio }}>
      <ul
        ref={track}
        onScroll={count > 1 ? onScroll : undefined}
        onKeyDown={count > 1 ? onKeyDown : undefined}
        tabIndex={count > 1 ? 0 : undefined}
        aria-roledescription={count > 1 ? "carosello" : undefined}
        aria-label={count > 1 ? `Foto di ${username}, ${index + 1} di ${count}` : undefined}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {media.map((item) => (
          <li
            key={item.url}
            className="size-full min-w-full flex-none snap-center"
            aria-roledescription={count > 1 ? "diapositiva" : undefined}
          >
            <Slide
              item={item}
              label={
                item.kind === "video" ? `Video di ${username}` : `Foto pubblicata da ${username}`
              }
            />
          </li>
        ))}
      </ul>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]"
      />
      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          <div className="flex items-center gap-0.5 rounded-full bg-black/40 px-1">
            {media.map((item, position) => (
              <button
                key={item.url}
                type="button"
                onClick={() => goTo(position)}
                aria-label={`Vai alla foto ${position + 1}`}
                aria-current={position === index ? "true" : undefined}
                className="grid size-6 place-items-center"
              >
                <span
                  className={cn(
                    "block size-1.5 rounded-full bg-white/60 transition-[transform,background-color] duration-300 ease-out-expo",
                    position === index && "scale-125 bg-white",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

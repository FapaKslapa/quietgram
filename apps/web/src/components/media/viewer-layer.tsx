"use client";

import { ExternalLink, X } from "lucide-react";
import { animate, type PanInfo, useMotionValue, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";
import { MediaSlide } from "@/components/media/media-slide";
import { SwipeTrack, type SwipeTrackHandle } from "@/components/media/swipe-track";
import type { PostMediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";
import { backdropOpacity, shouldDismiss } from "@/lib/viewer";

export type ViewerRequest = {
  groupId: string;
  items: PostMediaItem[];
  index: number;
  username: string;
  caption: string | null;
  instagramUrl?: string | null | undefined;
  onIndexChange?: ((index: number) => void) | undefined;
};

type ViewerLayerProps = { request: ViewerRequest; onRequestClose: () => void };

const RETURN_SPRING = { type: "spring", stiffness: 380, damping: 40 } as const;

const useViewportWidth = (): number => {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
};

export function ViewerLayer({ request, onRequestClose }: ViewerLayerProps) {
  const { groupId, items, username, caption, instagramUrl, onIndexChange } = request;
  const [index, setIndex] = useState(request.index);
  const [swipedOut, setSwipedOut] = useState(false);
  const width = useViewportWidth();
  const y = useMotionValue(0);
  const fade = useTransform(y, backdropOpacity);
  const track = useRef<SwipeTrackHandle>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => {
    dialog.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onRequestClose();
      else if (event.key === "ArrowRight") track.current?.goTo(index + 1);
      else if (event.key === "ArrowLeft") track.current?.goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onRequestClose]);

  const changeIndex = (next: number) => {
    setIndex(next);
    onIndexChange?.(next);
  };

  const onVerticalEnd = async (info: PanInfo) => {
    if (!shouldDismiss(info.offset.y, info.velocity.y)) {
      void animate(y, 0, RETURN_SPRING);
      return;
    }
    setSwipedOut(true);
    const direction = info.offset.y < 0 ? -1 : 1;
    await animate(y, direction * window.innerHeight, {
      type: "spring",
      velocity: info.velocity.y,
      stiffness: 420,
      restDelta: 4,
      damping: 44,
    });
    onRequestClose();
  };

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-label={`Post di ${username}`}
      data-viewer
      ref={dialog}
      tabIndex={-1}
      className="fixed inset-0 z-[70] overflow-hidden text-white outline-none"
    >
      <m.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0"
      >
        <m.div style={{ opacity: fade }} className="size-full bg-black" />
      </m.div>

      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
      >
        <m.div
          style={{ opacity: fade }}
          className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        >
          <button
            type="button"
            onClick={onRequestClose}
            aria-label="Chiudi"
            className="pointer-events-auto grid size-11 place-items-center rounded-full bg-white/12 backdrop-blur-sm"
          >
            <X className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <p className="min-w-0 flex-1 truncate px-3 text-center text-sm font-semibold">
            {username}
          </p>
          {count > 1 ? (
            <p
              aria-live="polite"
              className="num-display grid h-11 min-w-11 place-items-center rounded-full bg-white/12 px-3 text-sm font-semibold"
            >
              {index + 1} / {count}
            </p>
          ) : (
            <span className="size-11" />
          )}
        </m.div>
      </m.div>

      <div className="absolute inset-0">
        <SwipeTrack
          handleRef={track}
          count={count}
          index={index}
          onIndexChange={changeIndex}
          fixedWidth={width}
          y={y}
          onVerticalEnd={(info) => void onVerticalEnd(info)}
          label={`Foto di ${username}`}
        >
          {items.map((item, position) => (
            <MediaSlide
              key={item.url}
              item={item}
              username={username}
              mode="viewer"
              active={position === index}
              eager
              layoutId={position === index && !swipedOut ? `${groupId}-${position}` : undefined}
            />
          ))}
        </SwipeTrack>
      </div>

      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 grid gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {caption ? (
          <p className="line-clamp-2 text-sm leading-snug text-white/85">{caption}</p>
        ) : null}
        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex h-11 w-fit items-center gap-2 justify-self-center rounded-full bg-white/12 px-5 text-sm font-semibold backdrop-blur-sm"
          >
            Apri su Instagram
            <ExternalLink className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </a>
        ) : null}
        {count > 1 ? (
          <div className="pointer-events-auto flex justify-center">
            {items.map((item, position) => (
              <button
                key={item.url}
                type="button"
                onClick={() => track.current?.goTo(position)}
                aria-label={`Vai alla foto ${position + 1}`}
                aria-current={position === index ? "true" : undefined}
                className="grid size-8 place-items-center"
              >
                <span
                  className={cn(
                    "block size-1.5 rounded-full bg-white/45 transition-[transform,background-color] duration-300 ease-out-expo",
                    position === index && "scale-125 bg-white",
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}
      </m.div>
    </m.div>
  );
}

"use client";

import { Heart } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { feedRatio, MediaSlide } from "@/components/media/media-slide";
import { SwipeTrack, type SwipeTrackHandle } from "@/components/media/swipe-track";
import { useViewer } from "@/components/media/viewer-provider";
import { DOUBLE_TAP_MS, registerTap } from "@/lib/double-tap";
import type { PostMediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";

type PostMediaProps = {
  media: PostMediaItem[];
  username: string;
  groupId: string;
  caption?: string | null;
  instagramUrl?: string | null;
  priority?: boolean;
  onDoubleTap?: (() => void) | undefined;
};

export function PostMedia({
  media,
  username,
  groupId,
  caption = null,
  instagramUrl = null,
  priority,
  onDoubleTap,
}: PostMediaProps) {
  const viewer = useViewer();
  const [index, setIndex] = useState(0);
  const track = useRef<SwipeTrackHandle>(null);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef<number | null>(null);
  const pendingOpen = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = media[0];
  const count = media.length;

  useEffect(
    () => () => {
      if (pendingOpen.current !== null) clearTimeout(pendingOpen.current);
    },
    [],
  );

  if (!first) return null;

  const open = (position: number) =>
    viewer.open({
      groupId,
      items: media,
      index: position,
      username,
      caption,
      instagramUrl,
      onIndexChange: setIndex,
    });

  const activate = (position: number) => {
    if (!onDoubleTap) {
      open(position);
      return;
    }
    if (pendingOpen.current !== null) clearTimeout(pendingOpen.current);
    const outcome = registerTap(lastTap.current, Date.now());
    lastTap.current = outcome.lastTap;
    if (outcome.double) {
      pendingOpen.current = null;
      setBurst((current) => current + 1);
      onDoubleTap();
      return;
    }
    pendingOpen.current = setTimeout(() => open(position), DOUBLE_TAP_MS);
  };

  return (
    <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: feedRatio(first) }}>
      <SwipeTrack
        handleRef={track}
        count={count}
        index={index}
        onIndexChange={setIndex}
        onActivate={open}
        label={count > 1 ? `Foto di ${username}, ${index + 1} di ${count}` : undefined}
      >
        {media.map((item, position) => (
          <MediaSlide
            key={item.url}
            item={item}
            username={username}
            mode="feed"
            active={position === index}
            eager={priority && position === 0}
            layoutId={`${groupId}-${position}`}
            onOpen={() => activate(position)}
          />
        ))}
      </SwipeTrack>
      <AnimatePresence>
        {burst > 0 ? (
          <motion.span
            key={burst}
            aria-hidden="true"
            initial={{ opacity: 1, scale: 0.4 }}
            animate={{ opacity: [1, 1, 0], scale: [0.4, 1.2, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => setBurst(0)}
            className="pointer-events-none absolute inset-0 grid place-items-center text-white"
          >
            <Heart
              className="size-24 fill-current drop-shadow-[0_2px_14px_rgb(0_0_0/0.4)]"
              strokeWidth={0}
            />
          </motion.span>
        ) : null}
      </AnimatePresence>
      {count > 1 ? (
        <>
          <p className="num-display pointer-events-none absolute top-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white">
            {index + 1}/{count}
          </p>
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <div className="flex items-center rounded-full bg-black/45 px-1">
              {media.map((item, position) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => track.current?.goTo(position)}
                  aria-label={`Vai alla foto ${position + 1}`}
                  aria-current={position === index ? "true" : undefined}
                  className="grid size-6 place-items-center"
                >
                  <motion.span
                    animate={{ scale: position === index ? 1.25 : 1 }}
                    className={cn(
                      "block size-1.5 rounded-full transition-colors duration-300",
                      position === index ? "bg-white" : "bg-white/55",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

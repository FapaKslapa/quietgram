"use client";

import { motion } from "motion/react";
import { useRef, useState } from "react";
import { feedRatio, MediaSlide } from "@/components/media/media-slide";
import { SwipeTrack, type SwipeTrackHandle } from "@/components/media/swipe-track";
import { useViewer } from "@/components/media/viewer-provider";
import type { PostMediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";

type PostMediaProps = {
  media: PostMediaItem[];
  username: string;
  groupId: string;
  caption?: string | null;
  instagramUrl?: string | null;
  priority?: boolean;
};

export function PostMedia({
  media,
  username,
  groupId,
  caption = null,
  instagramUrl = null,
  priority,
}: PostMediaProps) {
  const viewer = useViewer();
  const [index, setIndex] = useState(0);
  const track = useRef<SwipeTrackHandle>(null);
  const first = media[0];
  const count = media.length;

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
            onOpen={() => open(position)}
          />
        ))}
      </SwipeTrack>
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

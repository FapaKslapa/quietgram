"use client";

import { motion } from "motion/react";
import { LazyImage } from "@/components/media/lazy-image";
import { VideoPlayer } from "@/components/media/video-player";
import { mediaAspectRatio } from "@/lib/carousel";
import { mediaLabel, type PostMediaItem } from "@/lib/media";

const SHARED_SPRING = { type: "spring", stiffness: 340, damping: 38, mass: 0.9 } as const;

type MediaSlideProps = {
  item: PostMediaItem;
  username: string;
  mode: "feed" | "viewer";
  active: boolean;
  eager?: boolean | undefined;
  layoutId?: string | undefined;
  onOpen?: (() => void) | undefined;
};

export function MediaSlide({
  item,
  username,
  mode,
  active,
  eager,
  layoutId,
  onOpen,
}: MediaSlideProps) {
  const label = mediaLabel(item, username);
  const viewer = mode === "viewer";
  const ratio = item.width > 0 && item.height > 0 ? item.width / item.height : 1;
  const frameStyle = viewer
    ? { aspectRatio: ratio, width: `min(100%, calc((100dvh - 9rem) * ${ratio}))` }
    : {};

  return (
    <li
      className={
        viewer
          ? "grid size-full min-w-full flex-none place-items-center"
          : "size-full min-w-full flex-none"
      }
      aria-roledescription="diapositiva"
    >
      {item.kind === "video" ? (
        <div className={viewer ? "overflow-hidden rounded-md" : "size-full"} style={frameStyle}>
          <VideoPlayer
            src={item.url}
            label={label}
            fit={viewer ? "contain" : "cover"}
            active={active}
            {...(viewer || !onOpen ? {} : { onExpand: onOpen })}
          />
        </div>
      ) : (
        <motion.div
          {...(layoutId ? { layoutId } : {})}
          transition={SHARED_SPRING}
          {...(onOpen ? { onTap: onOpen } : {})}
          className={viewer ? "overflow-hidden rounded-md" : "size-full"}
          style={frameStyle}
        >
          <LazyImage
            src={item.url}
            alt={label}
            width={item.width}
            height={item.height}
            fit={viewer ? "contain" : "cover"}
            eager={eager ?? false}
          />
        </motion.div>
      )}
    </li>
  );
}

export const feedRatio = (item: PostMediaItem | undefined): number =>
  item ? mediaAspectRatio(item.width, item.height) : 1;

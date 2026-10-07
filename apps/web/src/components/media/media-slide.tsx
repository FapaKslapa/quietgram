"use client";

import * as m from "motion/react-m";
import { LazyImage } from "@/components/media/lazy-image";
import { VideoPlayer } from "@/components/media/video-player";
import { mediaLabel, type PostMediaItem } from "@/lib/media";

const SHARED_SPRING = { type: "spring", stiffness: 340, damping: 38, mass: 0.9 } as const;

type SlideMode = "feed" | "viewer";

type MediaSlideProps = {
  item: PostMediaItem;
  username: string;
  mode: SlideMode;
  active: boolean;
  eager?: boolean | undefined;
  layoutId?: string | undefined;
  onOpen?: (() => void) | undefined;
};

type Frame = { className: string; style: { aspectRatio?: number; width?: string } };

const frameFor = (item: PostMediaItem, mode: SlideMode): Frame => {
  if (mode === "feed") return { className: "size-full", style: {} };
  const ratio = item.width > 0 && item.height > 0 ? item.width / item.height : 1;
  return {
    className: "overflow-hidden rounded-md",
    style: { aspectRatio: ratio, width: `min(100%, calc((100dvh - 9rem) * ${ratio}))` },
  };
};

function VideoSlide({ item, username, mode, active, onOpen }: MediaSlideProps) {
  const { className, style } = frameFor(item, mode);
  const expand = mode === "feed" && onOpen ? { onExpand: onOpen } : {};

  return (
    <div className={className} style={style}>
      <VideoPlayer
        src={item.url}
        label={mediaLabel(item, username)}
        fit={mode === "viewer" ? "contain" : "cover"}
        active={active}
        {...expand}
      />
    </div>
  );
}

function ImageSlide({ item, username, mode, eager, layoutId, onOpen }: MediaSlideProps) {
  const { className, style } = frameFor(item, mode);

  return (
    <m.div
      {...(layoutId ? { layoutId } : {})}
      transition={SHARED_SPRING}
      {...(onOpen ? { onTap: onOpen } : {})}
      className={className}
      style={style}
    >
      <LazyImage
        src={item.url}
        alt={mediaLabel(item, username)}
        width={item.width}
        height={item.height}
        fit={mode === "viewer" ? "contain" : "cover"}
        eager={eager ?? false}
      />
    </m.div>
  );
}

export function MediaSlide(props: MediaSlideProps) {
  const className =
    props.mode === "viewer"
      ? "grid size-full min-w-full flex-none place-items-center"
      : "size-full min-w-full flex-none";

  return (
    <li className={className} aria-roledescription="diapositiva">
      {props.item.kind === "video" ? <VideoSlide {...props} /> : <ImageSlide {...props} />}
    </li>
  );
}

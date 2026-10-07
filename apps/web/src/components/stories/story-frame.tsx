"use client";

import { Loader2 } from "lucide-react";
import { animate, type PanInfo, useMotionValue, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { LazyImage } from "@/components/media/lazy-image";
import { STORY_TOP_INSET, StoryErrorView, StoryHeader } from "@/components/stories/story-states";
import { useStoryClock } from "@/hooks/use-story-clock";
import { mediaSrc } from "@/lib/media-proxy";
import {
  classifyRelease,
  clockRunning,
  itemDuration,
  type MediaPhase,
  type StoryItem,
  segmentFill,
  storyProgress,
  tapZone,
  upcomingItem,
} from "@/lib/stories";
import { formatRelativeTime } from "@/lib/time";
import { backdropOpacity, shouldDismiss } from "@/lib/viewer";

type StoryFrameProps = {
  username: string;
  avatarUrl: string | null;
  items: StoryItem[];
  index: number;
  now: number;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
};

type Press = { at: number; x: number; y: number; id: number };

const RETURN_SPRING = { type: "spring", stiffness: 380, damping: 40 } as const;

const preloadImage = (item: StoryItem | null) => {
  if (item?.media.kind !== "image") return;
  const image = new Image();
  image.referrerPolicy = "no-referrer";
  image.src = mediaSrc(item.media.url) ?? item.media.url;
};

export function StoryFrame({
  username,
  avatarUrl,
  items,
  index,
  now,
  onNext,
  onPrevious,
  onClose,
}: StoryFrameProps) {
  const item = items[index];
  const [held, setHeld] = useState(false);
  const [phase, setPhase] = useState<MediaPhase>("loading");
  const [attempt, setAttempt] = useState(0);
  const [videoSeconds, setVideoSeconds] = useState<number | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const press = useRef<Press | null>(null);
  const y = useMotionValue(0);
  const fade = useTransform(y, backdropOpacity);
  const kind = item?.media.kind ?? "image";
  const durationMs = itemDuration(kind, videoSeconds);
  const elapsed = useStoryClock({
    durationMs,
    running: clockRunning(phase, held),
    onComplete: onNext,
  });
  const progress = storyProgress(elapsed, durationMs);
  const upcoming = upcomingItem(items, index);

  useEffect(() => {
    preloadImage(upcoming);
  }, [upcoming]);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (held) element.pause();
    else void element.play().catch(() => undefined);
  }, [held]);

  const markReady = useCallback(() => setPhase("ready"), []);
  const markFailed = useCallback(() => setPhase("failed"), []);

  const retry = () => {
    setPhase("loading");
    setVideoSeconds(null);
    setAttempt((current) => current + 1);
  };

  if (!item) return null;

  if (phase === "failed") {
    return (
      <StoryErrorView
        username={username}
        avatarUrl={avatarUrl}
        message="Non riesco a caricare questa storia."
        onRetry={retry}
        onSkip={onNext}
        onClose={onClose}
      />
    );
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || press.current) return;
    press.current = {
      at: performance.now(),
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
    };
    setHeld(true);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = press.current;
    if (!start || start.id !== event.pointerId) return;
    press.current = null;
    setHeld(false);
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (classifyRelease(performance.now() - start.at, distance) !== "tap") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (tapZone(event.clientX - bounds.left, bounds.width) === "previous") onPrevious();
    else onNext();
  };

  const onPointerCancel = () => {
    press.current = null;
    setHeld(false);
  };

  const onDragEnd = async (_event: unknown, info: PanInfo) => {
    press.current = null;
    setHeld(false);
    if (info.offset.y <= 0 || !shouldDismiss(info.offset.y, info.velocity.y)) {
      void animate(y, 0, RETURN_SPRING);
      return;
    }
    await animate(y, window.innerHeight, {
      type: "spring",
      velocity: info.velocity.y,
      stiffness: 420,
      restDelta: 4,
      damping: 44,
    });
    onClose();
  };

  return (
    <m.div
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0.1 }}
      dragMomentum={false}
      onDragEnd={(event, info) => void onDragEnd(event, info)}
      style={{ y, opacity: fade }}
      className="absolute inset-0 touch-none overflow-hidden bg-black"
    >
      <div className="absolute inset-0 grid place-items-center">
        {item.media.kind === "video" ? (
          <video
            key={attempt}
            ref={video}
            src={mediaSrc(item.media.url)}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-label={`Storia di ${username}`}
            onLoadedMetadata={(event) => setVideoSeconds(event.currentTarget.duration)}
            onCanPlay={markReady}
            onPlaying={markReady}
            onWaiting={() => setPhase((current) => (current === "ready" ? "loading" : current))}
            onError={markFailed}
            className="size-full object-contain"
          />
        ) : (
          <LazyImage
            key={attempt}
            src={item.media.url}
            alt={`Storia di ${username}`}
            width={item.media.width}
            height={item.media.height}
            fit="contain"
            eager
            onLoaded={markReady}
            onFailed={markFailed}
          />
        )}
      </div>

      <div
        aria-hidden={phase === "ready"}
        className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-300 ${phase === "loading" ? "opacity-100" : "opacity-0"}`}
      >
        <Loader2
          className="size-7 text-white/70 motion-safe:animate-spin"
          strokeWidth={1.6}
          aria-hidden="true"
        />
      </div>

      <div
        data-testid="story-tap-layer"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="absolute inset-0 touch-none"
      />

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 grid gap-3 bg-linear-to-b from-black/60 to-transparent pb-8 ${STORY_TOP_INSET}`}
      >
        <ol className="flex gap-1" aria-label={`Storia ${index + 1} di ${items.length}`}>
          {items.map((entry, segment) => (
            <li key={entry.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <span
                className="block size-full origin-left rounded-full bg-white"
                style={{ transform: `scaleX(${segmentFill(segment, index, progress)})` }}
              />
            </li>
          ))}
        </ol>
        <StoryHeader
          username={username}
          avatarUrl={avatarUrl}
          onClose={onClose}
          trailing={
            <time
              dateTime={new Date(item.takenAt).toISOString()}
              className="num-display text-xs text-white/75"
              suppressHydrationWarning
            >
              {formatRelativeTime(item.takenAt, now)}
            </time>
          }
        />
      </div>
    </m.div>
  );
}

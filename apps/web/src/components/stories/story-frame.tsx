"use client";

import { X } from "lucide-react";
import { animate, motion, type PanInfo, useMotionValue, useTransform } from "motion/react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { LazyImage } from "@/components/media/lazy-image";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useStoryClock } from "@/hooks/use-story-clock";
import {
  classifyRelease,
  itemDuration,
  type StoryItem,
  segmentFill,
  storyProgress,
  tapZone,
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

type Press = { at: number; x: number; y: number };

const RETURN_SPRING = { type: "spring", stiffness: 380, damping: 40 } as const;

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
  const [videoSeconds, setVideoSeconds] = useState<number | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const press = useRef<Press | null>(null);
  const y = useMotionValue(0);
  const fade = useTransform(y, backdropOpacity);
  const kind = item?.media.kind ?? "image";
  const durationMs = itemDuration(kind, videoSeconds);
  const ready = kind === "image" || videoSeconds !== null;
  const elapsed = useStoryClock({ durationMs, running: ready && !held, onComplete: onNext });
  const progress = storyProgress(elapsed, durationMs);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") onNext();
      else if (event.key === "ArrowLeft") onPrevious();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrevious]);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (held) element.pause();
    else void element.play().catch(() => undefined);
  }, [held]);

  if (!item) return null;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    press.current = { at: performance.now(), x: event.clientX, y: event.clientY };
    setHeld(true);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = press.current;
    press.current = null;
    setHeld(false);
    if (!start) return;
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
    <motion.div
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
            ref={video}
            src={item.media.url}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-label={`Storia di ${username}`}
            onLoadedMetadata={(event) => setVideoSeconds(event.currentTarget.duration)}
            onError={() => setVideoSeconds(Number.NaN)}
            className="size-full object-contain"
          />
        ) : (
          <LazyImage
            src={item.media.url}
            alt={`Storia di ${username}`}
            width={item.media.width}
            height={item.media.height}
            fit="contain"
            eager
          />
        )}
      </div>

      <div
        data-testid="story-tap-layer"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="absolute inset-0 touch-none"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 grid gap-3 bg-linear-to-b from-black/60 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8">
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
        <div className="flex items-center gap-2.5 text-white">
          <UserAvatar username={username} avatarUrl={avatarUrl} />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{username}</p>
          <time
            dateTime={new Date(item.takenAt).toISOString()}
            className="num-display text-xs text-white/75"
            suppressHydrationWarning
          >
            {formatRelativeTime(item.takenAt, now)}
          </time>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="pointer-events-auto grid size-11 place-items-center rounded-full bg-white/12 backdrop-blur-sm"
          >
            <X className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

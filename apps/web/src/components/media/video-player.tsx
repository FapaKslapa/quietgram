"use client";

import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import * as m from "motion/react-m";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { mediaSrc } from "@/lib/media-proxy";
import { cn } from "@/lib/utils";

type VideoPlayerProps = {
  src: string;
  label: string;
  fit?: "cover" | "contain" | undefined;
  active?: boolean | undefined;
  onExpand?: (() => void) | undefined;
};

const VISIBLE_RATIO = 0.4;

export function VideoPlayer({
  src,
  label,
  fit = "cover",
  active = true,
  onExpand,
}: VideoPlayerProps) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio < VISIBLE_RATIO) video.current?.pause();
        }
      },
      { threshold: [0, VISIBLE_RATIO, 1] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) video.current?.pause();
  }, [active]);

  const toggle = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => setPlaying(false));
    else element.pause();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    toggle();
  };

  return (
    <div ref={root} className="relative size-full bg-foreground">
      <video
        ref={video}
        src={mediaSrc(src)}
        muted={muted}
        playsInline
        loop
        preload="metadata"
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")}
      />
      <m.div
        role="button"
        tabIndex={0}
        aria-label={playing ? "Metti in pausa" : "Riproduci"}
        onTap={toggle}
        onKeyDown={onKeyDown}
        className="absolute inset-0 grid cursor-pointer place-items-center"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-14 place-items-center rounded-full bg-background/90 text-foreground transition-[opacity,scale] duration-300 ease-out-expo",
            playing ? "scale-90 opacity-0" : "scale-100 opacity-100",
          )}
        >
          {playing ? (
            <Pause className="size-5 fill-current" strokeWidth={0} />
          ) : (
            <Play className="size-5 translate-x-px fill-current" strokeWidth={0} />
          )}
        </span>
      </m.div>
      <button
        type="button"
        onClick={() => setMuted((current) => !current)}
        aria-label={muted ? "Attiva l'audio" : "Disattiva l'audio"}
        aria-pressed={!muted}
        className="absolute bottom-2 left-2 grid size-11 place-items-center rounded-full text-white"
      >
        <span className="grid size-8 place-items-center rounded-full bg-black/50">
          {muted ? (
            <VolumeX className="size-4" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Volume2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
          )}
        </span>
      </button>
      {onExpand ? (
        <button
          type="button"
          onClick={onExpand}
          aria-label="Apri a schermo intero"
          className="absolute top-2 right-2 grid size-11 place-items-center rounded-full text-white"
        >
          <span className="grid size-8 place-items-center rounded-full bg-black/50">
            <Maximize2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
        </button>
      ) : null}
    </div>
  );
}

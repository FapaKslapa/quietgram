"use client";

import {
  type MotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import type { RefreshProgress } from "@/hooks/use-refresh";
import { PULL_MAX, PULL_THRESHOLD, type PullPhase, pullLabel, pullProgress } from "@/lib/pull";

type PullSurfaceProps = {
  pull: MotionValue<number>;
  phase: PullPhase;
  nextLabel: string;
  progress: RefreshProgress | null;
  children: ReactNode;
};

const WAVE_TRAVEL = 1.6;
const MAX_STRETCH = 1.7;
const MAX_GLOW = 0.1;

function PullIndicator({ pull, phase, nextLabel, progress }: Omit<PullSurfaceProps, "children">) {
  const reveal = useTransform(pull, [0, PULL_THRESHOLD * 0.6, PULL_THRESHOLD], [0, 0.4, 1]);
  const line = useTransform(pull, (distance) => pullProgress(distance));
  const known = progress !== null && progress.total > 0;
  const label =
    phase === "refreshing" && known
      ? `Aggiornamento ${progress.completed} / ${progress.total}`
      : pullLabel(phase, nextLabel);

  return (
    <m.div
      aria-hidden="true"
      style={{ height: pull, opacity: reveal }}
      className="pointer-events-none absolute inset-x-0 top-0 grid items-end overflow-hidden"
    >
      <div className="column grid justify-items-center gap-2 px-5 pb-3">
        <p className="num-display text-xs font-medium text-muted-foreground">{label}</p>
        <div className="h-px w-16 overflow-hidden rounded-full bg-border">
          <m.div
            style={{ scaleX: phase === "refreshing" ? 1 : line }}
            className={
              phase === "refreshing"
                ? "h-full origin-left bg-foreground motion-safe:animate-pulse"
                : "h-full origin-left bg-foreground"
            }
          />
        </div>
      </div>
    </m.div>
  );
}

export function PullSurface({ pull, phase, nextLabel, progress, children }: PullSurfaceProps) {
  const reduced = useReducedMotion();
  const band = useRef<HTMLDivElement>(null);

  const apply = useCallback(
    (distance: number) => {
      const style = band.current?.style;
      if (!style) return;
      const ratio = Math.min(distance / PULL_MAX, 1);
      style.setProperty("--pull-shift", `${reduced ? 0 : distance * WAVE_TRAVEL}px`);
      style.setProperty("--pull-stretch", String(1 + (reduced ? 0 : ratio * (MAX_STRETCH - 1))));
      style.setProperty("--pull-glow", String(ratio * MAX_GLOW));
    },
    [reduced],
  );

  useMotionValueEvent(pull, "change", apply);

  useEffect(() => apply(pull.get()), [apply, pull]);

  return (
    <div className="relative" data-pulling={phase === "idle" ? undefined : ""}>
      <PullIndicator pull={pull} phase={phase} nextLabel={nextLabel} progress={progress} />
      <m.div ref={band} style={{ y: pull }}>
        {children}
      </m.div>
    </div>
  );
}

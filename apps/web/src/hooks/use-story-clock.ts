"use client";

import { useEffect, useRef, useState } from "react";
import { advanceElapsed, isComplete } from "@/lib/stories";

type StoryClockOptions = { durationMs: number; running: boolean; onComplete: () => void };

export function useStoryClock({ durationMs, running, onComplete }: StoryClockOptions): number {
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const completed = useRef(onComplete);
  useEffect(() => {
    completed.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!running || durationMs <= 0) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current = advanceElapsed(elapsedRef.current, now - last, durationMs, true);
      last = now;
      setElapsed(elapsedRef.current);
      if (isComplete(elapsedRef.current, durationMs)) {
        completed.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, durationMs]);

  return elapsed;
}

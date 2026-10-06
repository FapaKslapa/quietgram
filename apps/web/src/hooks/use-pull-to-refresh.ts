"use client";

import { animate, type MotionValue, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyPullStart,
  decidePull,
  PULL_HOLD,
  type PullPhase,
  pullPhase,
  pullResistance,
  type TouchPoint,
} from "@/lib/pull";

const RELEASE_SPRING = { type: "spring", stiffness: 380, damping: 36 } as const;
const BLOCKED_HOLD = 44;
const BLOCKED_NOTICE_MS = 1800;
const HAPTIC_MS = 12;
const LAYER_SELECTOR = "[data-viewer],[data-slot='drawer-popup'],[data-slot='drawer-overlay']";

type PullOptions = {
  enabled: boolean;
  cooling: boolean;
  busy: boolean;
  onTrigger: () => void;
};

type PullGesture = "none" | "undecided" | "pull" | "ignore";

export type PullState = { pull: MotionValue<number>; phase: PullPhase };

export function usePullToRefresh({ enabled, cooling, busy, onTrigger }: PullOptions): PullState {
  const pull = useMotionValue(0);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<PullPhase>("idle");
  const latest = useRef({ cooling, busy, onTrigger, reduced });
  latest.current = { cooling, busy, onTrigger, reduced };
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  const settleTo = useCallback(
    (target: number) => {
      if (latest.current.reduced) pull.set(target);
      else void animate(pull, target, RELEASE_SPRING);
    },
    [pull],
  );

  useEffect(() => {
    if (dragging.current) return;
    if (busy) {
      setPhase("refreshing");
      settleTo(PULL_HOLD);
    } else {
      setPhase("idle");
      settleTo(0);
    }
  }, [busy, settleTo]);

  useEffect(() => {
    if (!enabled) return;
    let gesture: PullGesture = "none";
    let origin: TouchPoint = { x: 0, y: 0 };
    let anchorY = 0;

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const inLayer = event.target instanceof Element && event.target.closest(LAYER_SELECTOR);
      if (event.touches.length !== 1 || !touch || window.scrollY > 0 || inLayer) {
        gesture = "ignore";
        return;
      }
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      origin = { x: touch.clientX, y: touch.clientY };
      gesture = "undecided";
    };

    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || gesture === "ignore" || gesture === "none") return;
      const point = { x: touch.clientX, y: touch.clientY };
      if (gesture === "undecided") {
        const decision = classifyPullStart(origin, point);
        if (decision === "undecided") return;
        if (decision === "ignore") {
          gesture = "ignore";
          return;
        }
        gesture = "pull";
        dragging.current = true;
        anchorY = point.y;
      }
      if (event.cancelable) event.preventDefault();
      const base = latest.current.busy ? PULL_HOLD : 0;
      pull.set(Math.max(0, base + pullResistance(point.y - anchorY)));
      setPhase(pullPhase(pull.get(), latest.current.cooling, latest.current.busy));
    };

    const onEnd = () => {
      if (gesture !== "pull") {
        gesture = "none";
        return;
      }
      gesture = "none";
      dragging.current = false;
      const { cooling: isCooling, busy: isBusy, onTrigger: trigger } = latest.current;
      const decision = decidePull(pull.get(), isCooling, isBusy);
      if (decision === "trigger") {
        navigator.vibrate?.(HAPTIC_MS);
        setPhase("refreshing");
        settleTo(PULL_HOLD);
        trigger();
        return;
      }
      if (decision === "blocked" && !isBusy) {
        settleTo(BLOCKED_HOLD);
        noticeTimer.current = setTimeout(() => {
          settleTo(0);
          setPhase("idle");
        }, BLOCKED_NOTICE_MS);
        return;
      }
      settleTo(isBusy ? PULL_HOLD : 0);
      setPhase(isBusy ? "refreshing" : "idle");
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [enabled, pull, settleTo]);

  return { pull, phase };
}

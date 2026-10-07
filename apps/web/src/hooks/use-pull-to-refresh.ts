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

type PhaseOverride = { phase: PullPhase; busy: boolean; dragging: boolean };

type PullGesture = "none" | "undecided" | "pull" | "ignore";

export type PullState = { pull: MotionValue<number>; phase: PullPhase };

export function usePullToRefresh({ enabled, cooling, busy, onTrigger }: PullOptions): PullState {
  const pull = useMotionValue(0);
  const reduced = useReducedMotion();
  const [override, setOverride] = useState<PhaseOverride | null>(null);
  const latest = useRef({ cooling, busy, onTrigger, reduced });
  const dragging = useRef(false);

  useEffect(() => {
    latest.current = { cooling, busy, onTrigger, reduced };
  }, [cooling, busy, onTrigger, reduced]);

  const overridden = override !== null && (override.dragging || override.busy === busy);
  const phase: PullPhase = overridden ? override.phase : busy ? "refreshing" : "idle";

  const settleTo = useCallback(
    (target: number) => {
      if (latest.current.reduced) pull.set(target);
      else void animate(pull, target, RELEASE_SPRING);
    },
    [pull],
  );

  useEffect(() => {
    if (dragging.current) return;
    settleTo(busy ? PULL_HOLD : 0);
  }, [busy, settleTo]);

  const noticeShown = override?.phase === "blocked" && !override.dragging;

  useEffect(() => {
    if (!noticeShown) return;
    const timer = setTimeout(() => {
      settleTo(0);
      setOverride(null);
    }, BLOCKED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [noticeShown, settleTo]);

  useEffect(() => {
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
      const next = pullPhase(pull.get(), latest.current.cooling, latest.current.busy);
      setOverride((current) =>
        current?.dragging && current.phase === next
          ? current
          : { phase: next, busy: latest.current.busy, dragging: true },
      );
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
        setOverride({ phase: "refreshing", busy: isBusy, dragging: false });
        settleTo(PULL_HOLD);
        trigger();
        return;
      }
      if (decision === "blocked" && !isBusy) {
        settleTo(BLOCKED_HOLD);
        setOverride({ phase: "blocked", busy: false, dragging: false });
        return;
      }
      settleTo(isBusy ? PULL_HOLD : 0);
      setOverride(null);
    };

    const controller = new AbortController();
    const { signal } = controller;
    if (enabled) {
      window.addEventListener("touchstart", onStart, { passive: true, signal });
      window.addEventListener("touchmove", onMove, { passive: false, signal });
      window.addEventListener("touchend", onEnd, { signal });
      window.addEventListener("touchcancel", onEnd, { signal });
    }
    return () => {
      controller.abort();
    };
  }, [enabled, pull, settleTo]);

  return { pull, phase };
}

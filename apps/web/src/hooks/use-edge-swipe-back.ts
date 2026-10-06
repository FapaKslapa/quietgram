"use client";

import { animate, type MotionValue, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

const EDGE_WIDTH = 28;
const TRIGGER_DISTANCE = 96;
const DECIDE_DISTANCE = 8;
const LEAVE_SPRING = { type: "spring", stiffness: 380, damping: 38 } as const;

type Gesture = "none" | "undecided" | "swipe" | "ignore";

export function useEdgeSwipeBack(onBack: () => void): {
  x: MotionValue<number>;
  goBack: () => void;
} {
  const x = useMotionValue(0);
  const reduced = useReducedMotion();
  const latest = useRef({ onBack, reduced });
  latest.current = { onBack, reduced };

  const goBack = useCallback(() => {
    if (latest.current.reduced) {
      latest.current.onBack();
      return;
    }
    void animate(x, window.innerWidth, LEAVE_SPRING).then(() => latest.current.onBack());
  }, [x]);

  useEffect(() => {
    let gesture: Gesture = "none";
    let originX = 0;
    let originY = 0;

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const inLayer =
        event.target instanceof Element &&
        event.target.closest("[data-slot='drawer-popup'],[data-slot='drawer-overlay']");
      if (event.touches.length !== 1 || !touch || touch.clientX > EDGE_WIDTH || inLayer) {
        gesture = "ignore";
        return;
      }
      originX = touch.clientX;
      originY = touch.clientY;
      gesture = "undecided";
    };

    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || gesture === "ignore" || gesture === "none") return;
      const dx = touch.clientX - originX;
      const dy = touch.clientY - originY;
      if (gesture === "undecided") {
        if (Math.hypot(dx, dy) < DECIDE_DISTANCE) return;
        gesture = dx > 0 && dx > Math.abs(dy) ? "swipe" : "ignore";
        if (gesture === "ignore") return;
      }
      x.set(Math.max(0, dx));
    };

    const onEnd = () => {
      if (gesture !== "swipe") {
        gesture = "none";
        return;
      }
      gesture = "none";
      if (x.get() >= TRIGGER_DISTANCE) {
        goBack();
        return;
      }
      if (latest.current.reduced) x.set(0);
      else void animate(x, 0, LEAVE_SPRING);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [goBack, x]);

  return { x, goBack };
}

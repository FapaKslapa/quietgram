"use client";

import { useEffect, useRef } from "react";
import { accumulate, budgetReached } from "@/lib/budget";

const STORAGE_KEY = "budget-used-ms";
const TICK_MS = 1000;

const readUsed = (): number => {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

const writeUsed = (usedMs: number): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(usedMs));
  } catch {
    return;
  }
};

type BudgetClockOptions = { minutes: number | null; paused: boolean; onReached: () => void };

export function useBudgetClock({ minutes, paused, onReached }: BudgetClockOptions): void {
  const reached = useRef(onReached);
  reached.current = onReached;

  useEffect(() => {
    if (minutes === null || paused) return;
    let usedMs = readUsed();
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      usedMs = accumulate(usedMs, now - last, document.visibilityState === "visible");
      last = now;
      writeUsed(usedMs);
      if (budgetReached(usedMs, minutes)) {
        clearInterval(timer);
        writeUsed(0);
        reached.current();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [minutes, paused]);
}

"use client";

import { useSyncExternalStore } from "react";
import { floorToMinute } from "@/lib/time";

const REFRESH_MS = 60_000;

const subscribe = (listener: () => void) => {
  const timer = setInterval(listener, REFRESH_MS);
  return () => clearInterval(timer);
};

const getNow = (): number => floorToMinute(Date.now());

export function useNow(): number {
  return useSyncExternalStore(subscribe, getNow, getNow);
}

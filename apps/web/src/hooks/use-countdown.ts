"use client";

import { useEffect, useState } from "react";
import { remainingMs } from "@/lib/pairing-countdown";

const TICK_MS = 1000;

export function useCountdown(expiresAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (expiresAt === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return expiresAt === null ? 0 : remainingMs(expiresAt, now);
}

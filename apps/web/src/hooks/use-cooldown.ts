"use client";

import { useEffect, useState } from "react";

const MAX_TIMEOUT_MS = 2_147_483_647;

export function useCooldown(until: number | null): boolean {
  const [cooling, setCooling] = useState(false);

  useEffect(() => {
    if (until === null) {
      setCooling(false);
      return;
    }
    const remaining = until - Date.now();
    if (remaining <= 0) {
      setCooling(false);
      return;
    }
    setCooling(true);
    const timer = setTimeout(() => setCooling(false), Math.min(remaining, MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [until]);

  return cooling;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  markSeenLocal,
  parseSeenMap,
  SEEN_STORAGE_KEY,
  type SeenMap,
  type TrayEntry,
} from "@/lib/stories";

export function useSeenStories() {
  const [seen, setSeen] = useState<SeenMap>({});

  useEffect(() => {
    try {
      setSeen(parseSeenMap(window.localStorage.getItem(SEEN_STORAGE_KEY)));
    } catch {
      setSeen({});
    }
  }, []);

  const markSeen = useCallback((entry: Pick<TrayEntry, "userId" | "latestReelMedia">) => {
    setSeen((current) => {
      const next = markSeenLocal(current, entry);
      if (next === current) return current;
      try {
        window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next));
      } catch {
        return next;
      }
      return next;
    });
  }, []);

  return { seen, markSeen };
}

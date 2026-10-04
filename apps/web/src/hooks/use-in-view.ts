"use client";

import { useCallback, useRef } from "react";

export function useInView(onEnter: () => void, rootMargin = "600px 0px") {
  const handler = useRef(onEnter);
  handler.current = onEnter;
  const observer = useRef<IntersectionObserver | null>(null);

  return useCallback(
    (node: Element | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (!node) return;
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) handler.current();
        },
        { rootMargin },
      );
      observer.current.observe(node);
    },
    [rootMargin],
  );
}

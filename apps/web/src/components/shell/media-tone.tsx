"use client";

import { useEffect } from "react";
import { GRAYSCALE_CLASS } from "@/lib/media-tone";

export function MediaTone({ grayscale }: { grayscale: boolean }) {
  useEffect(() => {
    document.documentElement.classList.toggle(GRAYSCALE_CLASS, grayscale);
    return () => document.documentElement.classList.remove(GRAYSCALE_CLASS);
  }, [grayscale]);

  return null;
}

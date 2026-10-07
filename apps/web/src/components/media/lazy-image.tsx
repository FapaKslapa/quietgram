"use client";

import { useCallback, useState } from "react";
import { mediaSrc } from "@/lib/media-proxy";
import { cn } from "@/lib/utils";

type LazyImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  fit?: "cover" | "contain" | undefined;
  eager?: boolean | undefined;
  className?: string | undefined;
};

export function LazyImage({
  src,
  alt,
  width,
  height,
  fit = "cover",
  eager = false,
  className,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const attach = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <img
      ref={attach}
      src={mediaSrc(src)}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onLoad={() => setLoaded(true)}
      className={cn(
        "size-full transition-opacity duration-500 ease-out-expo select-none",
        fit === "cover" ? "object-cover" : "object-contain",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}

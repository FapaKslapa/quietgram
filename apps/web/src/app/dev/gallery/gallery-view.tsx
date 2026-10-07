"use client";

import { renderView } from "@/app/dev/gallery/registry";
import type { GalleryViewName } from "@/app/dev/gallery/views";
import { ViewerProvider } from "@/components/media/viewer-provider";

export function GalleryView({ view }: { view: GalleryViewName }) {
  return (
    <ViewerProvider>
      <div className="w-full flex-1 pb-28">{renderView(view)}</div>
    </ViewerProvider>
  );
}

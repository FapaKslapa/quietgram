import type { ReactNode } from "react";
import type { GalleryViewName } from "@/app/dev/gallery/views";

export type ViewMap = Partial<Record<GalleryViewName, () => ReactNode>>;

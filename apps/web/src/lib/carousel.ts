import type { PostMediaItem } from "@/lib/media";

export const clampIndex = (index: number, count: number): number =>
  count <= 0 ? 0 : Math.min(Math.max(Math.round(index), 0), count - 1);

const MIN_RATIO = 0.8;
const MAX_RATIO = 1.5;

export const mediaAspectRatio = (width: number, height: number): number =>
  width > 0 && height > 0 ? Math.min(Math.max(width / height, MIN_RATIO), MAX_RATIO) : MIN_RATIO;

const SNAP_PROJECTION_S = 0.2;
const SNAP_FRACTION = 0.25;

export const snapIndex = (
  index: number,
  count: number,
  offsetX: number,
  velocityX: number,
  width: number,
): number => {
  if (width <= 0) return clampIndex(index, count);
  const projected = offsetX + velocityX * SNAP_PROJECTION_S;
  if (Math.abs(projected) < width * SNAP_FRACTION) return clampIndex(index, count);
  return clampIndex(index + (projected < 0 ? 1 : -1), count);
};

export const trackOffset = (index: number, width: number): number => 0 - index * width;

export const feedRatio = (item: PostMediaItem | undefined): number =>
  item ? mediaAspectRatio(item.width, item.height) : 1;

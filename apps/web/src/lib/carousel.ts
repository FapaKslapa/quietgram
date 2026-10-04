export const clampIndex = (index: number, count: number): number =>
  count <= 0 ? 0 : Math.min(Math.max(Math.round(index), 0), count - 1);

export const indexFromScroll = (scrollLeft: number, width: number, count: number): number =>
  width <= 0 ? 0 : clampIndex(scrollLeft / width, count);

const MIN_RATIO = 0.8;
const MAX_RATIO = 1.5;

export const mediaAspectRatio = (width: number, height: number): number =>
  width > 0 && height > 0 ? Math.min(Math.max(width / height, MIN_RATIO), MAX_RATIO) : MIN_RATIO;

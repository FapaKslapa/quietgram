export const DISMISS_DISTANCE = 120;
export const DISMISS_VELOCITY = 600;
const FADE_DISTANCE = 420;

export const shouldDismiss = (offsetY: number, velocityY: number): boolean => {
  if (Math.abs(velocityY) >= DISMISS_VELOCITY && Math.sign(velocityY) === Math.sign(offsetY)) {
    return true;
  }
  return Math.abs(offsetY) >= DISMISS_DISTANCE;
};

export const backdropOpacity = (offsetY: number): number =>
  Math.max(0, 1 - Math.abs(offsetY) / FADE_DISTANCE);

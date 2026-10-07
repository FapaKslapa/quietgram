export const REFRESH_COOLDOWN_MS = 15 * 60_000;
export const THROTTLE_COOLDOWN_MS = 30 * 60_000;

export const throttleMarker = (now: Date): Date =>
  new Date(now.getTime() + THROTTLE_COOLDOWN_MS - REFRESH_COOLDOWN_MS);

export const remainingCooldownMs = (
  lastRefreshAt: Date | null,
  now: Date,
  cooldownMs: number,
): number =>
  lastRefreshAt === null ? 0 : Math.max(0, cooldownMs - (now.getTime() - lastRefreshAt.getTime()));

export const MESSAGES_COOLDOWN_MS = 60_000;

export const isWithinWindow = (lastAt: Date | null, now: Date, windowMs: number): boolean =>
  remainingCooldownMs(lastAt, now, windowMs) > 0;

export const SAVED_COOLDOWN_MS = 60_000;
export const STORIES_COOLDOWN_MS = 30_000;
export const PROFILE_COOLDOWN_MS = 60_000;
export const AVATAR_MAX_AGE_MS = 3 * 86_400_000;

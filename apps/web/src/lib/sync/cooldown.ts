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

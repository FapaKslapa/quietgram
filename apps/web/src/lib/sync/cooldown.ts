export const REFRESH_COOLDOWN_MS = 5 * 60_000;

export const remainingCooldownMs = (
  lastRefreshAt: Date | null,
  now: Date,
  cooldownMs: number,
): number =>
  lastRefreshAt === null ? 0 : Math.max(0, cooldownMs - (now.getTime() - lastRefreshAt.getTime()));

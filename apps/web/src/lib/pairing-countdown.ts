export const TOKEN_LIFETIME_MS = 10 * 60_000;

export const remainingMs = (expiresAt: number, now: number): number => Math.max(0, expiresAt - now);

export const formatCountdown = (milliseconds: number): string => {
  const total = Math.ceil(Math.max(0, milliseconds) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const isExpired = (expiresAt: number, now: number): boolean =>
  remainingMs(expiresAt, now) === 0;

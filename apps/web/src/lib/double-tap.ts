export const DOUBLE_TAP_MS = 280;

export type TapOutcome = { double: boolean; lastTap: number | null };

export const registerTap = (lastTap: number | null, now: number): TapOutcome =>
  lastTap !== null && now - lastTap >= 0 && now - lastTap <= DOUBLE_TAP_MS
    ? { double: true, lastTap: null }
    : { double: false, lastTap: now };

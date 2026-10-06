export const BUDGET_CHOICES = [5, 10, 15, 30] as const;

export type BudgetMinutes = (typeof BUDGET_CHOICES)[number];

export const BUDGET_LOCK_MS = 60 * 60_000;
export const MAX_TICK_MS = 5_000;

export const isBudgetMinutes = (value: number): value is BudgetMinutes =>
  BUDGET_CHOICES.some((choice) => choice === value);

export const accumulate = (usedMs: number, elapsedMs: number, visible: boolean): number => {
  if (!visible) return usedMs;
  return usedMs + Math.min(Math.max(elapsedMs, 0), MAX_TICK_MS);
};

export const budgetReached = (usedMs: number, minutes: number | null): boolean =>
  minutes !== null && usedMs >= minutes * 60_000;

export const lockExpiry = (now: number): number => now + BUDGET_LOCK_MS;

export const isLocked = (lockedUntil: number | null, now: number): boolean =>
  lockedUntil !== null && lockedUntil > now;

export const usedMinutes = (usedMs: number): number => Math.floor(usedMs / 60_000);

export const budgetLabel = (minutes: number | null): string =>
  minutes === null ? "Spento" : `${minutes} minuti`;

"use client";

import { useBudgetClock } from "@/hooks/use-budget-clock";
import { useFeedSettings } from "@/hooks/use-feed-settings";
import { isLocked } from "@/lib/budget";

export function BudgetTracker() {
  const { settings, lockBudget } = useFeedSettings();
  const locked = isLocked(settings.budgetLockedUntil, Date.now());

  useBudgetClock({
    minutes: settings.sessionBudgetMinutes,
    paused: locked || lockBudget.isPending,
    onReached: () => lockBudget.mutate(),
  });

  return null;
}

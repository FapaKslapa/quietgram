"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BudgetLockView } from "@/components/posta/budget-lock-view";
import { useBodyHost } from "@/hooks/use-body-host";
import { useCooldown } from "@/hooks/use-cooldown";
import { useFeedSettings } from "@/hooks/use-feed-settings";
import { useTRPC } from "@/trpc/client";

export function BudgetLock({ lockedUntil }: { lockedUntil: number }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { settings } = useFeedSettings();
  const host = useBodyHost();
  const active = useCooldown(lockedUntil);
  const wasActive = useRef(false);

  useEffect(() => {
    if (active) {
      wasActive.current = true;
      return;
    }
    if (!wasActive.current) return;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.feed.list.infiniteQueryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() }),
    ]);
  }, [active, queryClient, trpc]);

  if (!host) return null;
  return createPortal(
    <BudgetLockView minutes={settings.sessionBudgetMinutes} reopensAt={lockedUntil} />,
    host,
  );
}

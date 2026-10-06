"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { RefreshPanel } from "@/components/posta/refresh-panel";
import { useCooldown } from "@/hooks/use-cooldown";
import { useRefresh } from "@/hooks/use-refresh";
import { formatClock } from "@/lib/time";
import { useTRPC } from "@/trpc/client";

export function RefreshRow() {
  const trpc = useTRPC();
  const { data: overview } = useSuspenseQuery(trpc.refresh.overview.queryOptions());
  const { refresh, progress } = useRefresh();
  const cooling = useCooldown(overview.nextRefreshAt);

  const never = overview.lastRefreshAt === null;
  const label = never ? "Aggiornato" : "Aggiornato alle";
  const last = overview.lastRefreshAt === null ? "Mai" : formatClock(overview.lastRefreshAt);
  const next =
    overview.nextRefreshAt !== null && cooling
      ? `Prossimo aggiornamento dalle ${formatClock(overview.nextRefreshAt)}`
      : "Pronto per aggiornare";

  return (
    <RefreshPanel
      label={label}
      last={last}
      next={next}
      disabled={cooling || progress !== null}
      progress={progress}
      onRefresh={() => void refresh()}
    />
  );
}

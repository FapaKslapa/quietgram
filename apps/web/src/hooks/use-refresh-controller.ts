"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useCooldown } from "@/hooks/use-cooldown";
import { type RefreshProgress, useRefresh } from "@/hooks/use-refresh";
import { useRefreshResume } from "@/hooks/use-refresh-resume";
import { BACKOFF_NOTE } from "@/lib/credentials/copy";
import { formatClock } from "@/lib/time";
import { useTRPC } from "@/trpc/client";

export type RefreshController = {
  hint: string | null;
  nextLabel: string;
  note: string | null;
  cooling: boolean;
  progress: RefreshProgress | null;
  refresh: () => void;
};

export function useRefreshController(): RefreshController {
  const trpc = useTRPC();
  const { data: overview } = useSuspenseQuery(trpc.refresh.overview.queryOptions());
  const { refresh, progress } = useRefresh();
  const cooling = useCooldown(overview.nextRefreshAt);

  useRefreshResume({ refresh: () => void refresh(), cooling });

  const nextLabel =
    overview.nextRefreshAt === null
      ? "Prossimo aggiornamento a breve"
      : `Prossimo aggiornamento dalle ${formatClock(overview.nextRefreshAt)}`;

  return {
    hint: overview.nextRefreshAt !== null && cooling ? nextLabel : null,
    nextLabel,
    note: overview.backoffUntil === null ? null : BACKOFF_NOTE,
    cooling,
    progress,
    refresh: () => void refresh(),
  };
}

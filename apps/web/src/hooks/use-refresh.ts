"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cooldownMessage } from "@/lib/cooldown-label";
import { classifyRefreshError } from "@/lib/refresh-failure";
import { useTRPC } from "@/trpc/client";

export type RefreshProgress = { completed: number; total: number };

export function useRefresh() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<RefreshProgress | null>(null);
  const running = useRef(false);
  const start = useMutation(trpc.refresh.start.mutationOptions());
  const step = useMutation(trpc.refresh.step.mutationOptions());
  const overviewKey = trpc.refresh.overview.queryKey();

  const handleFailure = (error: unknown) => {
    const failure = classifyRefreshError(error);
    if (failure.kind === "cooldown") {
      queryClient.setQueryData(overviewKey, (current) =>
        current ? { ...current, nextRefreshAt: Date.now() + failure.seconds * 1000 } : current,
      );
      toast.info(cooldownMessage(failure.seconds));
    } else if (failure.kind === "expired") {
      queryClient.setQueryData(overviewKey, (current) =>
        current ? { ...current, sessionStatus: "expired" as const } : current,
      );
    } else {
      toast.error("Non sono riuscito a ritirare la posta. Riprova tra poco.");
    }
  };

  const refresh = async () => {
    if (running.current) return;
    running.current = true;
    setProgress({ completed: 0, total: 0 });
    try {
      const { runId, total } = await start.mutateAsync();
      setProgress({ completed: 0, total });
      let finished = false;
      while (!finished) {
        const result = await step.mutateAsync({ runId });
        setProgress({ completed: result.completed, total: result.total });
        await queryClient.invalidateQueries({ queryKey: trpc.feed.list.infiniteQueryKey() });
        if (result.status === "failed") {
          toast.error("Il ritiro si è interrotto. Riprova tra poco.");
        }
        finished = result.done;
      }
    } catch (error) {
      handleFailure(error);
    } finally {
      running.current = false;
      setProgress(null);
      await queryClient.invalidateQueries({ queryKey: overviewKey });
    }
  };

  return { refresh, progress };
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cooldownMessage, THROTTLE_TOAST } from "@/lib/cooldown-label";
import { classifyRefreshError, isNetworkFailure, isRunGone } from "@/lib/refresh-failure";
import { forgetRun, markInterrupted, recallRun, rememberRun } from "@/lib/refresh-resume";
import { useTRPC } from "@/trpc/client";

export type RefreshProgress = {
  completed: number;
  total: number;
  authors: { checked: number; total: number } | null;
};

const STALLED_STEP_PAUSE_MS = 1500;
const NETWORK_RETRIES = 2;

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
    } else if (failure.kind === "throttled") {
      forgetRun();
      queryClient.setQueryData(overviewKey, (current) =>
        current ? { ...current, nextRefreshAt: Date.now() + failure.seconds * 1000 } : current,
      );
      toast.info(THROTTLE_TOAST);
    } else if (failure.kind === "expired") {
      forgetRun();
      markInterrupted();
      queryClient.setQueryData(overviewKey, (current) =>
        current ? { ...current, sessionStatus: "expired" as const } : current,
      );
    } else if (!isNetworkFailure(error)) {
      forgetRun();
      toast.error("Non sono riuscito ad aggiornare. Riprova tra poco.");
    }
  };

  const stepWithRetry = async (runId: string) => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await step.mutateAsync({ runId });
      } catch (error) {
        if (!isNetworkFailure(error) || attempt >= NETWORK_RETRIES) throw error;
        await pause(STALLED_STEP_PAUSE_MS);
      }
    }
  };

  const walk = async (runId: string): Promise<"done" | "failed"> => {
    let lastCompleted = -1;
    for (;;) {
      const result = await stepWithRetry(runId);
      if (!result.done && result.completed === lastCompleted) await pause(STALLED_STEP_PAUSE_MS);
      lastCompleted = result.completed;
      setProgress({ completed: result.completed, total: result.total, authors: result.authors });
      await queryClient.invalidateQueries({ queryKey: trpc.feed.list.infiniteQueryKey() });
      if (result.done) return result.status === "failed" ? "failed" : "done";
    }
  };

  const resumeKnown = async (runId: string): Promise<boolean> => {
    try {
      return (await walk(runId)) === "done";
    } catch (error) {
      if (isRunGone(error)) return false;
      throw error;
    }
  };

  const refresh = async () => {
    if (running.current) return;
    running.current = true;
    setProgress({ completed: 0, total: 0, authors: null });
    try {
      const known = recallRun();
      if (known !== null && (await resumeKnown(known))) {
        forgetRun();
        return;
      }
      forgetRun();
      const { runId, total } = await start.mutateAsync();
      rememberRun(runId);
      setProgress({ completed: 0, total, authors: null });
      const outcome = await walk(runId);
      forgetRun();
      if (outcome === "failed") toast.error("L'aggiornamento si è interrotto. Riprova tra poco.");
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

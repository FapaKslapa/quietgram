"use client";

import { useQueryClient } from "@tanstack/react-query";
import { classifyRefreshError } from "@/lib/refresh-failure";
import { useTRPC } from "@/trpc/client";

export function useSessionExpiry() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const overviewKey = trpc.refresh.overview.queryKey();

  return (error: unknown): boolean => {
    if (classifyRefreshError(error).kind !== "expired") return false;
    queryClient.setQueryData(overviewKey, (current) =>
      current ? { ...current, sessionStatus: "expired" as const } : current,
    );
    return true;
  };
}

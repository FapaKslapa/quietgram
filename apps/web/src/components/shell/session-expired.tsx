"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SessionExpiredView } from "@/components/shell/session-expired-view";
import { classifyRefreshError } from "@/lib/refresh-failure";
import { useTRPC } from "@/trpc/client";

export function SessionExpired() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const recheck = useMutation(
    trpc.refresh.recheck.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    }),
  );
  const kind = recheck.isError ? classifyRefreshError(recheck.error).kind : null;
  const failure =
    kind === null ? null : kind === "throttled" || kind === "expired" ? kind : "other";

  return (
    <SessionExpiredView
      checking={recheck.isPending}
      failure={failure}
      onRecheck={() => recheck.mutate()}
    />
  );
}

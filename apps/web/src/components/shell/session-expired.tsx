"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SessionExpiredView } from "@/components/shell/session-expired-view";
import { classifyRefreshError } from "@/lib/refresh-failure";
import { useTRPC } from "@/trpc/client";

export function SessionExpired() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const credentials = useQuery(trpc.credentials.status.queryOptions());
  const resume = useMutation(trpc.credentials.resume.mutationOptions());
  const recheck = useMutation(
    trpc.refresh.recheck.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
      onSettled: () => credentials.refetch(),
    }),
  );
  const kind = recheck.isError ? classifyRefreshError(recheck.error).kind : null;
  const failure =
    kind === null ? null : kind === "throttled" || kind === "expired" ? kind : "other";

  const state = credentials.data?.state;
  const attention = state === "challenge" || state === "rejected" ? state : null;

  const retry = async () => {
    if (attention === "challenge") await resume.mutateAsync().catch(() => undefined);
    recheck.mutate();
  };

  return (
    <SessionExpiredView
      attention={attention}
      checking={recheck.isPending || resume.isPending}
      failure={failure}
      onRecheck={() => void retry()}
    />
  );
}

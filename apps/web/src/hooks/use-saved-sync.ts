"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSessionExpiry } from "@/hooks/use-session-expiry";
import { useTRPC } from "@/trpc/client";

export function useSavedSync() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const expireSession = useSessionExpiry();

  return useMutation(
    trpc.saved.sync.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.saved.list.queryKey() }),
      onError: (error) => {
        if (expireSession(error)) return;
        toast.error("Non sono riuscito ad aggiornare i salvati. Riprova tra poco.");
      },
    }),
  );
}

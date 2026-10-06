"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSessionExpiry } from "@/hooks/use-session-expiry";
import { readFailureMessage } from "@/lib/messages";
import { useTRPC } from "@/trpc/client";

export function useInboxSync() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const expireSession = useSessionExpiry();

  return useMutation(
    trpc.messages.syncInbox.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: trpc.messages.threads.queryKey() }),
      onError: (error) => {
        if (expireSession(error)) return;
        toast.error(
          readFailureMessage(
            error,
            "Non sono riuscito ad aggiornare i messaggi. Riprova tra poco.",
          ),
        );
      },
    }),
  );
}

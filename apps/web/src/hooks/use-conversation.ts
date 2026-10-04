"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSessionExpiry } from "@/hooks/use-session-expiry";
import {
  appendUnique,
  createPending,
  dropMessage,
  mergeThread,
  sendFailureMessage,
  settlePending,
  type ThreadMessage,
} from "@/lib/messages";
import { useTRPC } from "@/trpc/client";

export function useConversation(threadId: string, viewerId: string | null) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const expireSession = useSessionExpiry();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const requested = useRef(false);
  const threadsKey = trpc.messages.threads.queryKey();

  const load = useMutation(
    trpc.messages.thread.mutationOptions({
      onSuccess: (server) => setMessages((current) => mergeThread(server, current)),
      onError: (error) => {
        expireSession(error);
      },
    }),
  );
  const deliver = useMutation(trpc.messages.send.mutationOptions());

  const { mutate: loadThread } = load;

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    loadThread({ threadId });
  }, [loadThread, threadId]);

  const reload = useCallback(() => loadThread({ threadId }), [loadThread, threadId]);

  const send = async (text: string): Promise<boolean> => {
    const pending = createPending(viewerId ?? "", text.trim(), Date.now());
    setMessages((current) => appendUnique(current, pending));
    try {
      const sent = await deliver.mutateAsync({ threadId, text });
      setMessages((current) => settlePending(current, pending.id, sent));
      void queryClient.invalidateQueries({ queryKey: threadsKey });
      return true;
    } catch (error) {
      setMessages((current) => dropMessage(current, pending.id));
      if (!expireSession(error)) toast.error(sendFailureMessage(error));
      return false;
    }
  };

  return { messages, send, reload, loading: load.isPending, failed: load.isError };
}

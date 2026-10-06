"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSessionExpiry } from "@/hooks/use-session-expiry";
import { useSyncGuard } from "@/hooks/use-sync-guard";
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
  const guard = useSyncGuard(`thread:${threadId}`);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [stale, setStale] = useState(false);
  const [sentKeys, setSentKeys] = useState<ReadonlySet<string>>(new Set());
  const requested = useRef(false);
  const threadsKey = trpc.messages.threads.queryKey();

  const load = useMutation(
    trpc.messages.thread.mutationOptions({
      onSuccess: (server) => {
        setMessages((current) => mergeThread(server.messages, current));
        setStale(server.stale);
      },
      onError: (error) => {
        expireSession(error);
      },
    }),
  );
  const deliver = useMutation(trpc.messages.send.mutationOptions());

  const { mutate: loadThread } = load;
  const { mark } = guard;

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    mark();
    loadThread({ threadId });
  }, [loadThread, mark, threadId]);

  const reload = useCallback(() => {
    if (!guard.ready()) return;
    guard.mark();
    loadThread({ threadId });
  }, [guard, loadThread, threadId]);

  const send = async (text: string): Promise<boolean> => {
    const pending = createPending(viewerId ?? "", text.trim(), Date.now());
    setSentKeys((current) => new Set(current).add(pending.id));
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

  return {
    messages,
    send,
    reload,
    sentKeys,
    stale,
    loading: load.isPending,
    failed: load.isError,
  };
}

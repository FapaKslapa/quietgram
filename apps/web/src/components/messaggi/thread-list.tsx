"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ThreadSkeleton } from "@/components/messaggi/thread-skeleton";
import { ThreadRows, ThreadsEmpty, ThreadsError } from "@/components/messaggi/thread-states";
import { useInboxSync } from "@/hooks/use-inbox-sync";
import { useTRPC } from "@/trpc/client";

export function ThreadList() {
  const trpc = useTRPC();
  const { data: threads } = useSuspenseQuery(trpc.messages.threads.queryOptions());
  const sync = useInboxSync();
  const started = useRef(false);
  const { mutate: syncInbox } = sync;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    syncInbox();
  }, [syncInbox]);

  if (threads.length === 0) {
    if (sync.isIdle || sync.isPending) return <ThreadSkeleton />;
    if (sync.isError) return <ThreadsError onRetry={() => syncInbox()} />;
    return <ThreadsEmpty />;
  }

  return <ThreadRows threads={threads} now={Date.now()} />;
}

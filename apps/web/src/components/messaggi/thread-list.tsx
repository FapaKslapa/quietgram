"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThreadSkeleton } from "@/components/messaggi/thread-skeleton";
import { ThreadRows, ThreadsEmpty, ThreadsError } from "@/components/messaggi/thread-states";
import { PullSurface } from "@/components/posta/pull-surface";
import { ScreenHeader } from "@/components/shell/screen-header";
import { useCooldown } from "@/hooks/use-cooldown";
import { useInboxSync } from "@/hooks/use-inbox-sync";
import { useNow } from "@/hooks/use-now";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useSyncGuard } from "@/hooks/use-sync-guard";
import { useTRPC } from "@/trpc/client";

const INBOX_VIEW = "inbox";
const FRESH_LABEL = "Aggiornato poco fa";

export function ThreadList() {
  const now = useNow();
  const trpc = useTRPC();
  const { data: threads } = useSuspenseQuery(trpc.messages.threads.queryOptions());
  const sync = useInboxSync();
  const guard = useSyncGuard(INBOX_VIEW);
  const started = useRef(false);
  const { mutate: syncInbox } = sync;
  const { ready, mark: markGuard, until } = guard;
  const [coolUntil, setCoolUntil] = useState<number | null>(until);
  const cooling = useCooldown(coolUntil);

  const start = useCallback(() => {
    if (!ready()) return;
    markGuard();
    setCoolUntil(until());
    syncInbox();
  }, [ready, markGuard, until, syncInbox]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, [start]);

  const { pull, phase } = usePullToRefresh({
    enabled: true,
    cooling,
    busy: sync.isPending,
    onTrigger: start,
  });

  const body = (() => {
    if (threads.length === 0) {
      if (sync.isIdle || sync.isPending) return <ThreadSkeleton />;
      if (sync.isError) return <ThreadsError onRetry={start} />;
      return <ThreadsEmpty />;
    }
    return <ThreadRows threads={threads} now={now} />;
  })();

  return (
    <PullSurface pull={pull} phase={phase} nextLabel={FRESH_LABEL} progress={null}>
      <ScreenHeader title="Messaggi" variant="double" />
      {body}
    </PullSurface>
  );
}

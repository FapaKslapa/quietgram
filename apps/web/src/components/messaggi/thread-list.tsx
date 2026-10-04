"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Postmark } from "@/components/brand/postmark";
import { ThreadRow } from "@/components/messaggi/thread-row";
import { ThreadSkeleton } from "@/components/messaggi/thread-skeleton";
import { Button } from "@/components/ui/button";
import { useInboxSync } from "@/hooks/use-inbox-sync";
import { formatStampDay } from "@/lib/time";
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
    if (sync.isError) {
      return (
        <section role="alert" className="grid justify-items-center gap-2.5 px-8 pt-12 text-center">
          <h2 className="text-lg font-bold tracking-[-0.02em]">Non riesco a leggere i messaggi</h2>
          <p className="max-w-[30ch] text-[0.9375rem] text-balance text-soft">
            Instagram non ha risposto. Riprova tra un momento.
          </p>
          <Button
            type="button"
            onClick={() => syncInbox()}
            className="mt-2 h-11 rounded-full px-5 text-[0.9375rem] font-semibold"
          >
            Riprova
          </Button>
        </section>
      );
    }
    return (
      <section className="grid justify-items-center gap-2.5 px-8 pt-12 pb-16 text-center text-soft">
        <Postmark
          top="POSTA"
          bottom={formatStampDay(Date.now())}
          variant="double"
          className="size-24"
        />
        <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">Nessuna conversazione</h2>
        <p className="max-w-[30ch] text-[0.9375rem] text-balance">
          Quando qualcuno ti scrive, la conversazione compare qui.
        </p>
      </section>
    );
  }

  const now = Date.now();

  return (
    <ul className="grid gap-2.5 px-3 pb-5">
      {threads.map((thread) => (
        <li key={thread.id}>
          <ThreadRow thread={thread} now={now} />
        </li>
      ))}
    </ul>
  );
}

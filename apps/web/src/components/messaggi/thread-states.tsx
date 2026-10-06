import { ThreadRow, type ThreadSummary } from "@/components/messaggi/thread-row";
import { Button } from "@/components/ui/button";

export function ThreadRows({ threads, now }: { threads: ThreadSummary[]; now: number }) {
  return (
    <ul className="column grid divide-y px-4 pb-5">
      {threads.map((thread) => (
        <li key={thread.id}>
          <ThreadRow thread={thread} now={now} />
        </li>
      ))}
    </ul>
  );
}

export function ThreadsError({ onRetry }: { onRetry: () => void }) {
  return (
    <section role="alert" className="column grid justify-items-center gap-2 px-8 pt-16 text-center">
      <h2 className="text-xl font-bold tracking-[-0.025em]">Non riesco a leggere i messaggi</h2>
      <p className="max-w-[30ch] text-sm text-balance text-muted-foreground">
        Instagram non ha risposto. Riprova tra un momento.
      </p>
      <Button type="button" onClick={onRetry} className="mt-4">
        Riprova
      </Button>
    </section>
  );
}

export function ThreadsEmpty() {
  return (
    <section className="column grid justify-items-center gap-2 px-8 pt-16 pb-16 text-center">
      <h2 className="text-xl font-bold tracking-[-0.025em]">Nessuna conversazione</h2>
      <p className="max-w-[30ch] text-sm text-balance text-muted-foreground">
        Quando qualcuno ti scrive, la conversazione compare qui.
      </p>
    </section>
  );
}

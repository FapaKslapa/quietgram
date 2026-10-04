"use client";

import { useIsMutating, useSuspenseQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Postmark } from "@/components/brand/postmark";
import { SavedCard } from "@/components/salvati/saved-card";
import { SavedDrawer } from "@/components/salvati/saved-drawer";
import { SavedSkeleton } from "@/components/salvati/saved-skeleton";
import { Button } from "@/components/ui/button";
import { useSavedSync } from "@/hooks/use-saved-sync";
import { findSaved, type SavedItem, shouldAutoSync } from "@/lib/saved-grid";
import { formatStampDay } from "@/lib/time";
import { useTRPC } from "@/trpc/client";

export function SavedRefreshButton() {
  const trpc = useTRPC();
  const sync = useSavedSync();
  const pending = useIsMutating({ mutationKey: trpc.saved.sync.mutationKey() }) > 0;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => sync.mutate()}
      disabled={pending}
      aria-busy={pending}
      className="h-11 rounded-full bg-sheet px-4 text-[0.9375rem] font-semibold"
    >
      <RefreshCw
        className={pending ? "size-4 motion-safe:animate-spin" : "size-4"}
        aria-hidden="true"
      />
      {pending ? "Aggiorno" : "Aggiorna"}
    </Button>
  );
}

export function SavedGrid() {
  const trpc = useTRPC();
  const { data: items } = useSuspenseQuery(trpc.saved.list.queryOptions());
  const sync = useSavedSync();
  const tried = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const empty = items.length === 0;

  useEffect(() => {
    if (!shouldAutoSync(items.length, tried.current)) return;
    tried.current = true;
    sync.mutate();
  }, [items.length, sync.mutate]);

  const openItem = (item: SavedItem) => {
    setSelectedId(item.id);
    setOpen(true);
  };

  if (empty && (sync.isIdle || sync.isPending)) return <SavedSkeleton />;

  if (empty && sync.isError) {
    return (
      <section role="alert" className="grid justify-items-center gap-2.5 px-8 pt-12 text-center">
        <h2 className="text-lg font-bold tracking-[-0.02em]">Non riesco a leggere i salvati</h2>
        <p className="max-w-[30ch] text-[0.9375rem] text-balance text-soft">
          Instagram non ha risposto. Riprova tra un momento.
        </p>
        <Button
          type="button"
          onClick={() => sync.mutate()}
          className="mt-2 h-11 rounded-full px-5 text-[0.9375rem] font-semibold"
        >
          Riprova
        </Button>
      </section>
    );
  }

  if (empty) {
    return (
      <section className="grid justify-items-center gap-2.5 px-8 pt-12 pb-16 text-center text-soft">
        <Postmark
          top={formatStampDay(Date.now())}
          bottom="SALVATI"
          variant="arch"
          className="size-24"
        />
        <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">Nessun post salvato</h2>
        <p className="max-w-[30ch] text-[0.9375rem] text-balance">
          Salva un post su Instagram e lo ritrovi qui.
        </p>
      </section>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 px-3 pb-6">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <SavedCard item={item} onOpen={openItem} />
          </li>
        ))}
      </ul>
      <SavedDrawer item={findSaved(items, selectedId)} open={open} onOpenChange={setOpen} />
    </>
  );
}

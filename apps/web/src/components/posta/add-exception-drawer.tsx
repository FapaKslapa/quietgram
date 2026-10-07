"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useTRPC } from "@/trpc/client";

type AddExceptionDrawerProps = {
  excludedIds: ReadonlySet<string>;
  onAdd: (igUserId: string) => void;
};

function ResultRows({ search, excludedIds, onAdd }: AddExceptionDrawerProps & { search: string }) {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.settings.following.queryOptions({ search }, { placeholderData: keepPreviousData }),
  );

  if (query.isPending) {
    return (
      <div className="grid gap-2" aria-busy="true">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div
        role="alert"
        className="grid justify-items-start gap-3 py-2 text-sm text-muted-foreground"
      >
        <p>Non riesco a caricare gli account che segui.</p>
        <Button variant="outline" onClick={() => query.refetch()} size="sm">
          Riprova
        </Button>
      </div>
    );
  }

  if (query.data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground text-balance">
        {search === ""
          ? "Non ci sono ancora account seguiti. Aggiorna per scaricarli."
          : "Nessun account trovato. Prova con un altro nome."}
      </p>
    );
  }

  return (
    <ul className="grid gap-1">
      {query.data.map((account) => {
        const added = excludedIds.has(account.igUserId);
        return (
          <li key={account.igUserId}>
            <button
              type="button"
              disabled={added}
              onClick={() => onAdd(account.igUserId)}
              className="flex min-h-14 w-full items-center gap-3 rounded-md px-2 text-left transition-colors hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent"
            >
              <UserAvatar username={account.username} avatarUrl={account.avatarUrl} />
              <span className="min-w-0 flex-1 truncate font-medium">{account.username}</span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {added ? (
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    Aggiunta
                  </>
                ) : (
                  <>
                    <Plus className="size-4" aria-hidden="true" />
                    Aggiungi
                  </>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function AddExceptionDrawer({ excludedIds, onAdd }: AddExceptionDrawerProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const search = useDeferredValue(term.trim());

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger
        render={
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors hover:bg-accent"
          />
        }
      >
        <Plus className="size-4" aria-hidden="true" />
        Aggiungi
      </DrawerTrigger>
      <DrawerContent>
        <div className="column flex min-h-0 flex-col gap-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="pt-2">
            <DrawerTitle>Aggiungi un&apos;eccezione</DrawerTitle>
            <DrawerDescription>
              Scegli un account che segui: i suoi post arriveranno sempre in Posta.
            </DrawerDescription>
          </div>
          <Input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Cerca un account"
            aria-label="Cerca tra gli account che segui"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="rounded-full"
          />
          <div className="max-h-[45dvh] min-h-40 overflow-y-auto overscroll-contain">
            {open ? <ResultRows search={search} excludedIds={excludedIds} onAdd={onAdd} /> : null}
          </div>
          <DrawerClose render={<Button variant="outline" size="lg" className="w-full" />}>
            Fatto
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

"use client";

import { X } from "lucide-react";
import { AddExceptionDrawer } from "@/components/posta/add-exception-drawer";

type Exception = { igUserId: string; username: string | null };

type ExceptionsPanelProps = {
  exceptions: Exception[];
  onAdd: (igUserId: string) => void;
  onRemove: (igUserId: string) => void;
};

export function ExceptionsPanel({ exceptions, onAdd, onRemove }: ExceptionsPanelProps) {
  const excludedIds = new Set(exceptions.map((entry) => entry.igUserId));

  return (
    <section className="grid gap-3 rounded-[22px] bg-sheet px-[18px] py-4 shadow-[0_0_0_1px_var(--line)]">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-base font-semibold tracking-normal">Eccezioni</h3>
        <small className="text-soft">sempre in Posta</small>
      </header>
      <ul className="flex flex-wrap gap-2">
        {exceptions.map((entry) => {
          const name = entry.username ?? "account";
          return (
            <li key={entry.igUserId}>
              <span className="inline-flex min-h-10 items-center gap-1 rounded-full bg-paper pr-1 pl-3.5 text-sm font-medium shadow-[0_0_0_1px_var(--line)]">
                {name}
                <button
                  type="button"
                  onClick={() => onRemove(entry.igUserId)}
                  aria-label={`Rimuovi ${name}`}
                  className="grid size-8 place-items-center rounded-full text-soft transition-colors hover:bg-line hover:text-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </span>
            </li>
          );
        })}
        <li>
          <AddExceptionDrawer excludedIds={excludedIds} onAdd={onAdd} />
        </li>
      </ul>
      {exceptions.length === 0 ? (
        <small className="text-soft">Nessuna eccezione: aggiungi chi vuoi leggere sempre.</small>
      ) : null}
    </section>
  );
}

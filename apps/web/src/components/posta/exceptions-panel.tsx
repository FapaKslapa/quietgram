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
    <section className="grid gap-3 pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">Eccezioni</h3>
        <p className="text-sm text-muted-foreground">sempre in Posta</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {exceptions.map((entry) => {
          const name = entry.username ?? "account";
          return (
            <li key={entry.igUserId}>
              <span className="inline-flex h-10 items-center gap-1 rounded-full border pr-1 pl-4 text-sm font-medium">
                {name}
                <button
                  type="button"
                  onClick={() => onRemove(entry.igUserId)}
                  aria-label={`Rimuovi ${name}`}
                  className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
        <p className="text-sm text-muted-foreground">
          Nessuna eccezione: aggiungi chi vuoi leggere sempre.
        </p>
      ) : null}
    </section>
  );
}

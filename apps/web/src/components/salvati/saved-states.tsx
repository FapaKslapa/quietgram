import { RefreshCw } from "lucide-react";
import { SavedCard } from "@/components/salvati/saved-card";
import { Button } from "@/components/ui/button";
import type { SavedItem } from "@/lib/saved-grid";

type SavedRefreshControlProps = { pending: boolean; onRefresh: () => void };

export function SavedRefreshControl({ pending, onRefresh }: SavedRefreshControlProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={pending}
      aria-busy={pending}
      className="bg-background"
    >
      <RefreshCw
        className={pending ? "size-4 motion-safe:animate-spin" : "size-4"}
        aria-hidden="true"
      />
      {pending ? "Aggiorno" : "Aggiorna"}
    </Button>
  );
}

type SavedTilesProps = {
  items: SavedItem[];
  onOpen: (item: SavedItem) => void;
  labelOf?: ((item: SavedItem) => string) | undefined;
};

export function SavedTiles({ items, onOpen, labelOf }: SavedTilesProps) {
  return (
    <ul className="column grid grid-cols-3 gap-1.5 px-4 pb-6">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <SavedCard item={item} onOpen={onOpen} label={labelOf?.(item)} />
        </li>
      ))}
    </ul>
  );
}

export function SavedError({ onRetry }: { onRetry: () => void }) {
  return (
    <section role="alert" className="column grid justify-items-center gap-2 px-8 pt-16 text-center">
      <h2 className="text-xl font-bold tracking-[-0.025em]">Non riesco a leggere i salvati</h2>
      <p className="max-w-[30ch] text-sm text-balance text-muted-foreground">
        Instagram non ha risposto. Riprova tra un momento.
      </p>
      <Button type="button" onClick={onRetry} className="mt-4">
        Riprova
      </Button>
    </section>
  );
}

export function SavedEmpty() {
  return (
    <section className="column grid justify-items-center gap-2 px-8 pt-16 pb-16 text-center">
      <h2 className="text-xl font-bold tracking-[-0.025em]">Nessun post salvato</h2>
      <p className="max-w-[30ch] text-sm text-balance text-muted-foreground">
        Salva un post su Instagram e lo ritrovi qui.
      </p>
    </section>
  );
}

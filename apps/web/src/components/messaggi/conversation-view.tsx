import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { Bubbles } from "@/components/messaggi/bubbles";
import { Composer } from "@/components/messaggi/composer";
import { AuthorAvatar } from "@/components/posta/author-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationItem } from "@/lib/messages";

export type ConversationState = "failed" | "loading" | "empty" | "ready";

type ConversationViewProps = {
  title: string;
  state: ConversationState;
  items: ConversationItem[];
  pendingKeys: ReadonlySet<string>;
  sendEnabled: boolean;
  onSend: (text: string) => Promise<boolean>;
  onReload: () => void;
  scrollerRef?: Ref<HTMLDivElement>;
};

function ConversationSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-2 px-4 py-5">
      <Skeleton className="h-12 w-3/5 rounded-lg" />
      <Skeleton className="h-10 w-2/5 justify-self-end rounded-lg" />
      <Skeleton className="h-16 w-3/5 rounded-lg" />
    </div>
  );
}

function Body({
  state,
  items,
  pendingKeys,
  onReload,
}: Pick<ConversationViewProps, "state" | "items" | "pendingKeys" | "onReload">): ReactNode {
  if (state === "failed") {
    return (
      <section role="alert" className="grid justify-items-center gap-2 px-8 pt-16 text-center">
        <h2 className="text-xl font-bold tracking-[-0.025em]">
          Non riesco a caricare la conversazione
        </h2>
        <p className="max-w-[30ch] text-sm text-balance text-muted-foreground">
          Instagram non ha risposto. Riprova tra un momento.
        </p>
        <Button type="button" onClick={onReload} className="mt-4">
          Riprova
        </Button>
      </section>
    );
  }
  if (state === "loading") return <ConversationSkeleton />;
  if (state === "empty") {
    return (
      <p className="px-8 pt-16 text-center text-sm text-muted-foreground">
        Nessun messaggio ancora. Scrivi il primo.
      </p>
    );
  }
  return <Bubbles items={items} pendingKeys={pendingKeys} />;
}

export function ConversationView({
  title,
  state,
  items,
  pendingKeys,
  sendEnabled,
  onSend,
  onReload,
  scrollerRef,
}: ConversationViewProps) {
  return (
    <div className="column flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <Link
          href="/messaggi"
          aria-label="Torna ai messaggi"
          className="grid size-11 flex-none place-items-center rounded-full transition-colors hover:bg-accent"
        >
          <ChevronLeft className="size-6" strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <AuthorAvatar username={title} avatarUrl={null} className="size-9" />
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h1>
      </header>
      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Body state={state} items={items} pendingKeys={pendingKeys} onReload={onReload} />
      </div>
      <Composer onSend={onSend} enabled={sendEnabled} />
    </div>
  );
}

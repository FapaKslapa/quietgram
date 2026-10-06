import { ChevronLeft } from "lucide-react";
import { type MotionValue, motion, useReducedMotion } from "motion/react";
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
  enterKeys?: ReadonlySet<string> | undefined;
  stale?: boolean;
  sendEnabled: boolean;
  onSend: (text: string) => Promise<boolean>;
  onReload: () => void;
  scrollerRef?: Ref<HTMLDivElement>;
  onBack: () => void;
  dragX?: MotionValue<number> | undefined;
};

const ENTER_SLIDE = { duration: 0.28, ease: [0.16, 1, 0.3, 1] } as const;

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
  enterKeys,
  onReload,
}: Pick<
  ConversationViewProps,
  "state" | "items" | "pendingKeys" | "enterKeys" | "onReload"
>): ReactNode {
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
  return <Bubbles items={items} pendingKeys={pendingKeys} enterKeys={enterKeys} />;
}

export function ConversationView({
  title,
  state,
  items,
  pendingKeys,
  enterKeys,
  stale = false,
  sendEnabled,
  onSend,
  onReload,
  scrollerRef,
  onBack,
  dragX,
}: ConversationViewProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={ENTER_SLIDE}
      style={dragX ? { x: dragX } : {}}
      className="flex h-dvh min-w-0 flex-col bg-background"
    >
      <header className="border-b px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="column flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Torna ai messaggi"
            className="grid size-11 flex-none place-items-center rounded-full transition-colors hover:bg-accent"
          >
            <ChevronLeft className="size-6" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <AuthorAvatar username={title} avatarUrl={null} className="size-9 flex-none" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {stale ? (
              <p className="text-xs text-muted-foreground" role="status">
                Non aggiornato
              </p>
            ) : null}
          </div>
        </div>
      </header>
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div className="column">
          <Body
            state={state}
            items={items}
            pendingKeys={pendingKeys}
            enterKeys={enterKeys}
            onReload={onReload}
          />
        </div>
      </div>
      <Composer onSend={onSend} enabled={sendEnabled} />
    </motion.div>
  );
}

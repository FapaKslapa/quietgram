"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { Bubbles } from "@/components/messaggi/bubbles";
import { Composer } from "@/components/messaggi/composer";
import { AuthorAvatar } from "@/components/posta/author-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversation } from "@/hooks/use-conversation";
import { buildConversation, isPending } from "@/lib/messages";
import { useTRPC } from "@/trpc/client";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function ConversationSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-2.5 px-4 py-[18px]">
      <Skeleton className="h-12 w-3/5 rounded-[8px_22px_22px_22px]" />
      <Skeleton className="h-10 w-2/5 justify-self-end rounded-[22px_8px_22px_22px]" />
      <Skeleton className="h-16 w-3/5 rounded-[8px_22px_22px_22px]" />
    </div>
  );
}

export function Conversation({ threadId }: { threadId: string }) {
  const trpc = useTRPC();
  const { data: threads } = useSuspenseQuery(trpc.messages.threads.queryOptions());
  const { data: viewerId } = useSuspenseQuery(
    trpc.refresh.overview.queryOptions(undefined, { select: (overview) => overview.viewerId }),
  );
  const { messages, send, reload, loading, failed } = useConversation(threadId, viewerId);
  const scroller = useRef<HTMLDivElement>(null);
  const shown = useRef(0);

  const title = threads.find((thread) => thread.id === threadId)?.title ?? "Conversazione";
  const items = useMemo(
    () => buildConversation(messages, viewerId, Date.now()),
    [messages, viewerId],
  );
  const pendingKeys = useMemo(
    () => new Set(messages.filter(isPending).map((message) => message.id)),
    [messages],
  );

  useEffect(() => {
    const element = scroller.current;
    if (!element || messages.length === shown.current) return;
    const first = shown.current === 0;
    shown.current = messages.length;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: first || prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [messages.length]);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-120 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-3.5">
        <Link
          href="/messaggi"
          aria-label="Torna ai messaggi"
          className="grid size-11 flex-none place-items-center rounded-full text-ink transition-colors hover:bg-muted"
        >
          <ChevronLeft className="size-6" strokeWidth={1.6} aria-hidden="true" />
        </Link>
        <AuthorAvatar authorId={threadId} username={title} avatarUrl={null} />
        <h1 className="min-w-0 flex-1 truncate text-xl leading-tight font-bold tracking-[-0.02em]">
          {title}
        </h1>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {failed && messages.length === 0 ? (
          <section
            role="alert"
            className="grid justify-items-center gap-2.5 px-8 pt-16 text-center"
          >
            <h2 className="text-lg font-bold tracking-[-0.02em]">
              Non riesco a caricare la conversazione
            </h2>
            <p className="max-w-[30ch] text-[0.9375rem] text-balance text-soft">
              Instagram non ha risposto. Riprova tra un momento.
            </p>
            <Button
              type="button"
              onClick={reload}
              className="mt-2 h-11 rounded-full px-5 text-[0.9375rem] font-semibold"
            >
              Riprova
            </Button>
          </section>
        ) : loading && messages.length === 0 ? (
          <ConversationSkeleton />
        ) : items.length === 0 ? (
          <p className="px-8 pt-16 text-center text-[0.9375rem] text-soft">
            Nessun messaggio ancora. Scrivi il primo.
          </p>
        ) : (
          <Bubbles items={items} pendingKeys={pendingKeys} />
        )}
      </div>
      <Composer onSend={send} />
    </div>
  );
}

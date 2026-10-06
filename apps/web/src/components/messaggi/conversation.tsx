"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { type ConversationState, ConversationView } from "@/components/messaggi/conversation-view";
import { useConversation } from "@/hooks/use-conversation";
import { buildConversation, isPending } from "@/lib/messages";
import { useTRPC } from "@/trpc/client";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Conversation({ threadId }: { threadId: string }) {
  const trpc = useTRPC();
  const { data: threads } = useSuspenseQuery(trpc.messages.threads.queryOptions());
  const { data: viewerId } = useSuspenseQuery(
    trpc.refresh.overview.queryOptions(undefined, { select: (overview) => overview.viewerId }),
  );
  const { data: sendEnabled } = useSuspenseQuery(
    trpc.refresh.overview.queryOptions(undefined, { select: (overview) => overview.dmSendEnabled }),
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

  const state: ConversationState =
    failed && messages.length === 0
      ? "failed"
      : loading && messages.length === 0
        ? "loading"
        : items.length === 0
          ? "empty"
          : "ready";

  return (
    <ConversationView
      title={title}
      state={state}
      items={items}
      pendingKeys={pendingKeys}
      sendEnabled={sendEnabled}
      onSend={send}
      onReload={reload}
      scrollerRef={scroller}
    />
  );
}

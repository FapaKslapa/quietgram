"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { TabBarView } from "@/components/shell/tab-bar-view";
import { useTRPC } from "@/trpc/client";

export function TabBar() {
  const trpc = useTRPC();
  const pathname = usePathname();
  const { data: hasUnread = false } = useQuery(
    trpc.messages.threads.queryOptions(undefined, {
      select: (threads) => threads.some((thread) => thread.unread),
    }),
  );

  return <TabBarView pathname={pathname} unread={hasUnread} />;
}

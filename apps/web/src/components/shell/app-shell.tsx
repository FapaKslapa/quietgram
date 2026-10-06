"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SessionExpired } from "@/components/shell/session-expired";
import { TabBar } from "@/components/shell/tab-bar";
import { isConversationPath } from "@/lib/messages";
import { useTRPC } from "@/trpc/client";

export function AppShell({ children }: { children: ReactNode }) {
  const trpc = useTRPC();
  const pathname = usePathname();
  const { data: overview } = useSuspenseQuery(trpc.refresh.overview.queryOptions());

  if (overview.sessionStatus === "expired") return <SessionExpired />;
  if (isConversationPath(pathname)) return <>{children}</>;

  return (
    <>
      <div className="w-full flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))]">{children}</div>
      <TabBar />
    </>
  );
}

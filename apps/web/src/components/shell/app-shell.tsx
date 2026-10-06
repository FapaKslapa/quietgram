"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ViewerProvider } from "@/components/media/viewer-provider";
import { MediaTone } from "@/components/shell/media-tone";
import { SessionExpired } from "@/components/shell/session-expired";
import { TabBar } from "@/components/shell/tab-bar";
import { isConversationPath } from "@/lib/messages";
import { useTRPC } from "@/trpc/client";

export function AppShell({ children }: { children: ReactNode }) {
  const trpc = useTRPC();
  const pathname = usePathname();
  const { data: overview } = useSuspenseQuery(trpc.refresh.overview.queryOptions());
  const { data: settings } = useSuspenseQuery(trpc.settings.get.queryOptions());

  if (overview.sessionStatus === "expired") return <SessionExpired />;

  return (
    <ViewerProvider>
      <MediaTone grayscale={settings.grayscaleMedia} />
      {isConversationPath(pathname) ? (
        children
      ) : (
        <>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))]"
          >
            {children}
          </motion.div>
          <TabBar />
        </>
      )}
    </ViewerProvider>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StoriesBarSkeleton, StoriesBarView } from "@/components/stories/stories-bar-view";
import { StoryViewer } from "@/components/stories/story-viewer";
import { useBodyHost } from "@/hooks/use-body-host";
import { orderTray } from "@/lib/stories";
import { useTRPC } from "@/trpc/client";

const HISTORY_MARKER = "story-viewer";

export function StoriesBar() {
  const trpc = useTRPC();
  const host = useBodyHost();
  const tray = useQuery(trpc.stories.tray.queryOptions());
  const [group, setGroup] = useState<number | null>(null);
  const pushed = useRef(false);
  const entries = useMemo(() => orderTray(tray.data?.entries ?? []), [tray.data]);

  const open = useCallback((index: number) => {
    window.history.pushState({ [HISTORY_MARKER]: true }, "");
    pushed.current = true;
    setGroup(index);
  }, []);

  const requestClose = useCallback(() => {
    if (pushed.current) window.history.back();
    else setGroup(null);
  }, []);

  useEffect(() => {
    if (group === null) return;
    const onPop = () => {
      pushed.current = false;
      setGroup(null);
    };
    window.addEventListener("popstate", onPop);
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      document.documentElement.style.overflow = previous;
    };
  }, [group]);

  if (tray.isPending) return <StoriesBarSkeleton />;
  if (entries.length === 0) return null;

  return (
    <>
      <StoriesBarView entries={entries} onOpen={open} />
      {host
        ? createPortal(
            <AnimatePresence>
              {group !== null ? (
                <motion.div
                  key="story-viewer"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Storie"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-0 z-[70] overflow-hidden bg-black text-white"
                >
                  <StoryViewer entries={entries} startGroup={group} onClose={requestClose} />
                </motion.div>
              ) : null}
            </AnimatePresence>,
            host,
          )
        : null}
    </>
  );
}

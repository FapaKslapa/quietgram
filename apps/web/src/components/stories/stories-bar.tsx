"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  StoriesBarMessage,
  StoriesBarSkeleton,
  StoriesBarView,
} from "@/components/stories/stories-bar-view";
import { StoryViewer } from "@/components/stories/story-viewer";
import { useBodyHost } from "@/hooks/use-body-host";
import { useSeenStories } from "@/hooks/use-seen-stories";
import { applySeen, orderTray, type TrayEntry } from "@/lib/stories";
import { useTRPC } from "@/trpc/client";

const HISTORY_MARKER = "story-viewer";

type Session = { entries: TrayEntry[]; group: number };

export function StoriesBar() {
  const trpc = useTRPC();
  const host = useBodyHost();
  const tray = useQuery(trpc.stories.tray.queryOptions());
  const { seen, markSeen } = useSeenStories();
  const [session, setSession] = useState<Session | null>(null);
  const pushed = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const entries = useMemo(
    () => orderTray(applySeen(tray.data?.entries ?? [], seen)),
    [tray.data, seen],
  );

  const open = useCallback(
    (index: number) => {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      window.history.pushState({ [HISTORY_MARKER]: true }, "");
      pushed.current = true;
      setSession({ entries, group: index });
    },
    [entries],
  );

  const finish = useCallback(() => {
    pushed.current = false;
    setSession(null);
    opener.current?.focus({ preventScroll: true });
  }, []);

  const requestClose = useCallback(() => {
    if (pushed.current) window.history.back();
    else finish();
  }, [finish]);

  const dialog = useCallback((node: HTMLDivElement | null) => {
    node?.focus({ preventScroll: true });
  }, []);

  const active = session !== null;

  useEffect(() => {
    if (!active) return;
    window.addEventListener("popstate", finish);
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", finish);
      document.documentElement.style.overflow = previous;
    };
  }, [active, finish]);

  if (tray.isPending) return <StoriesBarSkeleton />;

  return (
    <>
      {entries.length > 0 ? (
        <StoriesBarView entries={entries} onOpen={open} />
      ) : (
        <StoriesBarMessage
          message={tray.isError ? "Storie non disponibili" : "Nessuna storia per ora"}
          onRetry={() => void tray.refetch()}
          retrying={tray.isFetching}
        />
      )}
      {host
        ? createPortal(
            <AnimatePresence>
              {session ? (
                <m.div
                  key="story-viewer"
                  ref={dialog}
                  tabIndex={-1}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Storie"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-0 z-[70] overflow-hidden bg-black text-white outline-none"
                >
                  <StoryViewer
                    entries={session.entries}
                    startGroup={session.group}
                    onClose={requestClose}
                    onSeen={markSeen}
                  />
                </m.div>
              ) : null}
            </AnimatePresence>,
            host,
          )
        : null}
    </>
  );
}

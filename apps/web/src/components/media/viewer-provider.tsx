"use client";

import { AnimatePresence } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ViewerLayer, type ViewerRequest } from "@/components/media/viewer-layer";
import { useBodyHost } from "@/hooks/use-body-host";

type ViewerApi = { open: (request: ViewerRequest) => void };

const ViewerContext = createContext<ViewerApi | null>(null);

export function useViewer(): ViewerApi {
  const api = useContext(ViewerContext);
  if (!api) throw new Error("useViewer must be used within a ViewerProvider.");
  return api;
}

const HISTORY_MARKER = "media-viewer";

export function ViewerProvider({ children }: { children: ReactNode }) {
  const host = useBodyHost();
  const [request, setRequest] = useState<ViewerRequest | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pushed = useRef(false);

  const open = useCallback((next: ViewerRequest) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.history.pushState({ [HISTORY_MARKER]: true }, "");
    pushed.current = true;
    setRequest(next);
  }, []);

  const close = useCallback(() => {
    setRequest(null);
    pushed.current = false;
    opener.current?.focus({ preventScroll: true });
  }, []);

  const requestClose = useCallback(() => {
    if (pushed.current) window.history.back();
    else close();
  }, [close]);

  useEffect(() => {
    if (!request) return;
    const onPop = () => close();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [request, close]);

  const api = useMemo<ViewerApi>(() => ({ open }), [open]);

  return (
    <ViewerContext.Provider value={api}>
      {children}
      {host
        ? createPortal(
            <AnimatePresence>
              {request ? (
                <ViewerLayer
                  key={request.groupId}
                  request={request}
                  onRequestClose={requestClose}
                />
              ) : null}
            </AnimatePresence>,
            host,
          )
        : null}
    </ViewerContext.Provider>
  );
}

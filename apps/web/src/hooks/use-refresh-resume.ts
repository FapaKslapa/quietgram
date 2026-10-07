"use client";

import { useEffect, useEffectEvent } from "react";
import { recallRun, takeInterrupted } from "@/lib/refresh-resume";

type ResumeOptions = { refresh: () => void; cooling: boolean };

export function useRefreshResume({ refresh, cooling }: ResumeOptions) {
  const resumeOnMount = useEffectEvent(() => {
    if (recallRun() !== null) refresh();
    else if (takeInterrupted() && !cooling) refresh();
  });
  const resumeOnReturn = useEffectEvent(() => {
    if (document.visibilityState === "visible" && recallRun() !== null) refresh();
  });

  useEffect(() => {
    resumeOnMount();
    const listener = () => resumeOnReturn();
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  }, []);
}

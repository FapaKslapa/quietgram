"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

const loadFeatures = () => import("@/lib/motion-features").then((module) => module.default);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LazyMotion features={loadFeatures}>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </ThemeProvider>
  );
}

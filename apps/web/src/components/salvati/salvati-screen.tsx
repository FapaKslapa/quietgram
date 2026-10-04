"use client";

import { Suspense } from "react";
import { SavedGrid, SavedRefreshButton } from "@/components/salvati/saved-grid";
import { SavedSkeleton } from "@/components/salvati/saved-skeleton";
import { ScreenHeader } from "@/components/shell/screen-header";

export function SalvatiScreen() {
  return (
    <>
      <ScreenHeader title="Salvati" variant="arch">
        <SavedRefreshButton />
      </ScreenHeader>
      <Suspense fallback={<SavedSkeleton />}>
        <SavedGrid />
      </Suspense>
    </>
  );
}

export function SalvatiSkeleton() {
  return (
    <>
      <ScreenHeader title="Salvati" variant="arch" />
      <SavedSkeleton />
    </>
  );
}

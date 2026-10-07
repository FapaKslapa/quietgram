import type { Metadata } from "next";
import { Suspense } from "react";
import { SalvatiScreen, SalvatiSkeleton } from "@/components/salvati/salvati-screen";
import { HydrateClient } from "@/trpc/hydrate-client";
import { prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Salvati" };

export default function SalvatiPage() {
  prefetch(trpc.saved.list.queryOptions());

  return (
    <HydrateClient>
      <Suspense fallback={<SalvatiSkeleton />}>
        <SalvatiScreen />
      </Suspense>
    </HydrateClient>
  );
}

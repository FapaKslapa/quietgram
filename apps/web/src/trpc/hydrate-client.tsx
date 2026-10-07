import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getQueryClient } from "@/trpc/server";

export function HydrateClient({ children }: { children: ReactNode }) {
  return <HydrationBoundary state={dehydrate(getQueryClient())}>{children}</HydrationBoundary>;
}

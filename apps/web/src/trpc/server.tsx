import "server-only";

import {
  dehydrate,
  type FetchQueryOptions,
  HydrationBoundary,
  type QueryKey,
} from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache, type ReactNode } from "react";
import { createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { makeQueryClient } from "./query-client";

export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  router: appRouter,
  ctx: async () => createTRPCContext(await headers()),
  queryClient: getQueryClient,
});

export function HydrateClient({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}

export function prefetch<TData, TError, TQueryKey extends QueryKey>(
  queryOptions: FetchQueryOptions<TData, TError, TData, TQueryKey>,
) {
  void getQueryClient().prefetchQuery(queryOptions);
}

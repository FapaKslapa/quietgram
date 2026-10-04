import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/routers/_app";

export type RouterOutputs = inferRouterOutputs<AppRouter>;

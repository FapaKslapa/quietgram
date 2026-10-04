import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import { feedRouter } from "@/server/trpc/routers/feed";
import { messagesRouter } from "@/server/trpc/routers/messages";
import { pairingRouter } from "@/server/trpc/routers/pairing";
import { refreshRouter } from "@/server/trpc/routers/refresh";
import { savedRouter } from "@/server/trpc/routers/saved";
import { settingsRouter } from "@/server/trpc/routers/settings";

const healthOutput = z.compile(z.object({ ok: z.literal(true) }));

export const appRouter = createTRPCRouter({
  feed: feedRouter,
  messages: messagesRouter,
  pairing: pairingRouter,
  saved: savedRouter,
  refresh: refreshRouter,
  settings: settingsRouter,
  health: publicProcedure.output(healthOutput).query(() => ({ ok: true as const })),
});

export type AppRouter = typeof appRouter;

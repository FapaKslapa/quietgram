import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import { commentsRouter } from "@/server/trpc/routers/comments";
import { credentialsRouter } from "@/server/trpc/routers/credentials";
import { feedRouter } from "@/server/trpc/routers/feed";
import { interactionsRouter } from "@/server/trpc/routers/interactions";
import { messagesRouter } from "@/server/trpc/routers/messages";
import { pairingRouter } from "@/server/trpc/routers/pairing";
import { profileRouter } from "@/server/trpc/routers/profile";
import { refreshRouter } from "@/server/trpc/routers/refresh";
import { savedRouter } from "@/server/trpc/routers/saved";
import { settingsRouter } from "@/server/trpc/routers/settings";
import { storiesRouter } from "@/server/trpc/routers/stories";

const healthOutput = z.compile(z.object({ ok: z.literal(true) }));

export const appRouter = createTRPCRouter({
  comments: commentsRouter,
  credentials: credentialsRouter,
  feed: feedRouter,
  interactions: interactionsRouter,
  messages: messagesRouter,
  pairing: pairingRouter,
  profile: profileRouter,
  saved: savedRouter,
  refresh: refreshRouter,
  settings: settingsRouter,
  stories: storiesRouter,
  health: publicProcedure.output(healthOutput).query(() => ({ ok: true as const })),
});

export type AppRouter = typeof appRouter;

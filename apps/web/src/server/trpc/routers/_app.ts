import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import { pairingRouter } from "@/server/trpc/routers/pairing";

const healthOutput = z.compile(z.object({ ok: z.literal(true) }));

export const appRouter = createTRPCRouter({
  pairing: pairingRouter,
  health: publicProcedure.output(healthOutput).query(() => ({ ok: true as const })),
});

export type AppRouter = typeof appRouter;

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { pairingRouter } from "./pairing";

const healthOutput = z.compile(z.object({ ok: z.literal(true) }));

export const appRouter = createTRPCRouter({
  pairing: pairingRouter,
  health: publicProcedure.output(healthOutput).query(() => ({ ok: true as const })),
});

export type AppRouter = typeof appRouter;

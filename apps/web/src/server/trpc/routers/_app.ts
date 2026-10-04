import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

const healthOutput = z.compile(z.object({ ok: z.literal(true) }));

export const appRouter = createTRPCRouter({
  health: publicProcedure.output(healthOutput).query(() => ({ ok: true as const })),
});

export type AppRouter = typeof appRouter;

import type { Db } from "@nodistraction/db";
import { initTRPC, TRPCError } from "@trpc/server";

export type TRPCSession = { user: { id: string } };

export type TRPCContext = {
  db: Db;
  getSession: () => Promise<TRPCSession | null>;
};

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = await ctx.getSession();
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session } });
});

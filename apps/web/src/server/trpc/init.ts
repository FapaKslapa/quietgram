import type { Db } from "@nodistraction/db";
import { initTRPC, TRPCError } from "@trpc/server";
import type { SyncDeps, SyncRuntime } from "@/lib/sync/deps";
import { describeFailure } from "@/server/trpc/errors";

export type TRPCSession = { user: { id: string } };

export type TRPCContext = {
  db: Db;
  getSession: () => Promise<TRPCSession | null>;
  sync: SyncRuntime;
};

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: { ...shape.data, failure: describeFailure(error.cause) },
  }),
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = await ctx.getSession();
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session } });
});

export const syncDepsOf = (ctx: TRPCContext): SyncDeps => ({ db: ctx.db, ...ctx.sync });

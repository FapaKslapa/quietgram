import { igSessions, syncState } from "@nodistraction/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { REFRESH_COOLDOWN_MS } from "@/lib/sync/cooldown";
import { recheckSession } from "@/lib/sync/recheck";
import { getRefreshStatus, runRefreshStep, startRefresh } from "@/lib/sync/refresh";
import { guarded } from "@/server/trpc/errors";
import { createTRPCRouter, protectedProcedure, syncDepsOf } from "@/server/trpc/init";

const runInput = z.compile(z.object({ runId: z.uuid() }));

const startOutput = z.compile(z.object({ runId: z.string(), total: z.number() }));

const progressOutput = z.compile(
  z.object({
    status: z.enum(["running", "done", "failed"]),
    done: z.boolean(),
    completed: z.number(),
    total: z.number(),
  }),
);

const overviewOutput = z.compile(
  z.object({
    sessionStatus: z.enum(["active", "expired", "none"]),
    viewerId: z.string().nullable(),
    lastRefreshAt: z.number().nullable(),
    nextRefreshAt: z.number().nullable(),
  }),
);

const recheckOutput = z.compile(z.object({ sessionStatus: z.literal("active") }));

export const refreshRouter = createTRPCRouter({
  overview: protectedProcedure.output(overviewOutput).query(async ({ ctx }) => {
    const ownerId = ctx.session.user.id;
    const [[session], [state]] = await Promise.all([
      ctx.db
        .select({ status: igSessions.status, igUserId: igSessions.igUserId })
        .from(igSessions)
        .where(eq(igSessions.ownerId, ownerId)),
      ctx.db.select().from(syncState).where(eq(syncState.ownerId, ownerId)),
    ]);
    const marker = state?.lastRefreshAt?.getTime() ?? null;
    return {
      sessionStatus: session?.status ?? "none",
      viewerId: session?.igUserId ?? null,
      lastRefreshAt: marker === null ? null : Math.min(marker, ctx.sync.now().getTime()),
      nextRefreshAt: marker === null ? null : marker + REFRESH_COOLDOWN_MS,
    };
  }),

  recheck: protectedProcedure
    .output(recheckOutput)
    .mutation(({ ctx }) => guarded(() => recheckSession(syncDepsOf(ctx), ctx.session.user.id))),

  start: protectedProcedure
    .output(startOutput)
    .mutation(({ ctx }) => guarded(() => startRefresh(syncDepsOf(ctx), ctx.session.user.id))),

  step: protectedProcedure
    .input(runInput)
    .output(progressOutput)
    .mutation(({ ctx, input }) =>
      guarded(() => runRefreshStep(syncDepsOf(ctx), ctx.session.user.id, input.runId)),
    ),

  status: protectedProcedure
    .input(runInput)
    .output(progressOutput)
    .query(({ ctx, input }) =>
      guarded(() => getRefreshStatus(syncDepsOf(ctx), ctx.session.user.id, input.runId)),
    ),
});

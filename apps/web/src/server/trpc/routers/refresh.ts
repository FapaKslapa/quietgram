import { z } from "zod";
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

export const refreshRouter = createTRPCRouter({
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

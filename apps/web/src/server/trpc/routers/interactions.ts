import { z } from "zod";
import { postComment, removeComment, type Toggle, toggle } from "@/lib/sync/interactions";
import { guarded } from "@/server/trpc/errors";
import { commentIdSchema, mediaIdSchema } from "@/server/trpc/ids";
import { createTRPCRouter, protectedProcedure, syncDepsOf } from "@/server/trpc/init";

const FAILURE = "Non riesco a completare l'azione";

const mediaInput = z.compile(z.object({ mediaId: mediaIdSchema }));
const commentInput = z.compile(z.object({ mediaId: mediaIdSchema, text: z.string() }));
const deleteInput = z.compile(z.object({ mediaId: mediaIdSchema, commentId: commentIdSchema }));

const flagsOutput = z.compile(z.object({ liked: z.boolean(), saved: z.boolean() }));
const okOutput = z.compile(z.object({ ok: z.literal(true) }));

const toggleProcedure = (action: Toggle) =>
  protectedProcedure
    .input(mediaInput)
    .output(flagsOutput)
    .mutation(({ ctx, input }) =>
      guarded(() => toggle(syncDepsOf(ctx), ctx.session.user.id, input.mediaId, action), FAILURE),
    );

export const interactionsRouter = createTRPCRouter({
  like: toggleProcedure("like"),
  unlike: toggleProcedure("unlike"),
  save: toggleProcedure("save"),
  unsave: toggleProcedure("unsave"),

  comment: protectedProcedure
    .input(commentInput)
    .output(okOutput)
    .mutation(({ ctx, input }) =>
      guarded(async () => {
        await postComment(syncDepsOf(ctx), ctx.session.user.id, input.mediaId, input.text);
        return { ok: true as const };
      }, FAILURE),
    ),

  deleteComment: protectedProcedure
    .input(deleteInput)
    .output(okOutput)
    .mutation(({ ctx, input }) =>
      guarded(async () => {
        await removeComment(syncDepsOf(ctx), ctx.session.user.id, input.mediaId, input.commentId);
        return { ok: true as const };
      }, FAILURE),
    ),
});

import { z } from "zod";
import { listComments } from "@/lib/sync/comments";
import { guarded } from "@/server/trpc/errors";
import { mediaIdSchema } from "@/server/trpc/ids";
import { createTRPCRouter, protectedProcedure, syncDepsOf } from "@/server/trpc/init";

const listInput = z.compile(z.object({ mediaId: mediaIdSchema }));

const listOutput = z.compile(
  z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      username: z.string(),
      avatarUrl: z.string().nullable(),
      text: z.string(),
      createdAt: z.number(),
      likeCount: z.number(),
      parentId: z.string().nullable(),
    }),
  ),
);

export const commentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listInput)
    .output(listOutput)
    .query(({ ctx, input }) =>
      guarded(
        () => listComments(syncDepsOf(ctx), ctx.session.user.id, input.mediaId),
        "Non riesco a leggere i commenti",
      ),
    ),
});

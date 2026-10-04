import { z } from "zod";
import { FEED_PAGE_SIZE, listFeed } from "@/lib/sync/feed";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

const MAX_PAGE_SIZE = 50;

const mediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string(),
  width: z.number(),
  height: z.number(),
});

const listInput = z.compile(
  z.object({
    cursor: z.number().int().optional(),
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(FEED_PAGE_SIZE),
  }),
);

const listOutput = z.compile(
  z.object({
    items: z.array(
      z.object({
        id: z.string(),
        authorId: z.string(),
        authorUsername: z.string(),
        caption: z.string().nullable(),
        takenAt: z.number(),
        seen: z.boolean(),
        media: z.array(mediaSchema),
      }),
    ),
    nextCursor: z.number().nullable(),
  }),
);

export const feedRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listInput)
    .output(listOutput)
    .query(({ ctx, input }) => listFeed(ctx.db, ctx.session.user.id, input)),
});

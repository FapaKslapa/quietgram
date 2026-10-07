import { z } from "zod";
import { listSaved, syncSaved } from "@/lib/sync/saved";
import { guarded } from "@/server/trpc/errors";
import { createTRPCRouter, protectedProcedure, syncDepsOf } from "@/server/trpc/init";

const listOutput = z.compile(
  z.array(
    z.object({
      id: z.string(),
      shortcode: z.string().nullable(),
      productType: z.string().nullable(),
      authorUsername: z.string(),
      authorAvatarUrl: z.string().nullable(),
      liked: z.boolean(),
      saved: z.boolean(),
      caption: z.string().nullable(),
      media: z.array(
        z.object({
          kind: z.enum(["image", "video"]),
          url: z.string(),
          width: z.number(),
          height: z.number(),
        }),
      ),
    }),
  ),
);

export const savedRouter = createTRPCRouter({
  list: protectedProcedure
    .output(listOutput)
    .query(({ ctx }) => listSaved(ctx.db, ctx.session.user.id)),

  sync: protectedProcedure.mutation(({ ctx }) =>
    guarded(() => syncSaved(syncDepsOf(ctx), ctx.session.user.id)),
  ),
});

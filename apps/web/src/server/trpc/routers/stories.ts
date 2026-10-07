import { z } from "zod";
import { fetchUserStories, listTray, syncTray } from "@/lib/sync/stories";
import { guarded } from "@/server/trpc/errors";
import { userIdSchema } from "@/server/trpc/ids";
import { createTRPCRouter, protectedProcedure, syncDepsOf } from "@/server/trpc/init";
import { serveWithFallback } from "@/server/trpc/stale";

const READ_FAILURE = "Non riesco a leggere le storie";

const mediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string(),
  width: z.number(),
  height: z.number(),
});

const trayOutput = z.compile(
  z.object({
    entries: z.array(
      z.object({
        userId: z.string(),
        username: z.string(),
        avatarUrl: z.string().nullable(),
        latestReelMedia: z.number().nullable(),
        seen: z.boolean(),
      }),
    ),
    stale: z.boolean(),
  }),
);

const userInput = z.compile(z.object({ userId: userIdSchema }));

const userOutput = z.compile(
  z.array(
    z.object({
      id: z.string(),
      takenAt: z.number(),
      expiresAt: z.number(),
      media: mediaSchema,
      productType: z.string(),
    }),
  ),
);

export const storiesRouter = createTRPCRouter({
  tray: protectedProcedure.output(trayOutput).query(({ ctx }) =>
    guarded(async () => {
      const ownerId = ctx.session.user.id;
      const deps = syncDepsOf(ctx);
      const served = await serveWithFallback(
        "stories.tray",
        async () => {
          await syncTray(deps, ownerId);
          return listTray(ctx.db, ownerId);
        },
        async () => {
          const stored = await listTray(ctx.db, ownerId);
          return stored.length > 0 ? stored : null;
        },
      );
      return { entries: served.value, stale: served.stale };
    }, READ_FAILURE),
  ),

  user: protectedProcedure
    .input(userInput)
    .output(userOutput)
    .query(({ ctx, input }) =>
      guarded(
        () => fetchUserStories(syncDepsOf(ctx), ctx.session.user.id, input.userId),
        READ_FAILURE,
      ),
    ),
});

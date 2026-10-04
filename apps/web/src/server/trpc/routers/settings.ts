import { feedExceptions, feedModes, following, userSettings } from "@nodistraction/db";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { loadSettings } from "@/lib/sync/settings";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

const MAX_THRESHOLD = 1_000_000_000;

const feedModeSchema = z.enum(feedModes);

const settingsOutput = z.compile(
  z.object({
    feedMode: feedModeSchema,
    creatorThreshold: z.number(),
    exceptions: z.array(z.object({ igUserId: z.string(), username: z.string().nullable() })),
  }),
);

const setFeedModeInput = z.compile(z.object({ feedMode: feedModeSchema }));
const setThresholdInput = z.compile(
  z.object({ creatorThreshold: z.number().int().min(0).max(MAX_THRESHOLD) }),
);
const exceptionInput = z.compile(z.object({ igUserId: z.string().regex(/^\d{1,20}$/) }));

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.output(settingsOutput).query(async ({ ctx }) => {
    const ownerId = ctx.session.user.id;
    const settings = await loadSettings(ctx.db, ownerId);
    const exceptionRows = await ctx.db
      .select({ igUserId: feedExceptions.igUserId })
      .from(feedExceptions)
      .where(eq(feedExceptions.ownerId, ownerId));
    const names = exceptionRows.length
      ? await ctx.db
          .select({ igUserId: following.igUserId, username: following.username })
          .from(following)
          .where(
            and(
              eq(following.ownerId, ownerId),
              inArray(
                following.igUserId,
                exceptionRows.map((row) => row.igUserId),
              ),
            ),
          )
      : [];
    const usernames = new Map(names.map((row) => [row.igUserId, row.username]));
    return {
      ...settings,
      exceptions: exceptionRows.map((row) => ({
        igUserId: row.igUserId,
        username: usernames.get(row.igUserId) ?? null,
      })),
    };
  }),

  setFeedMode: protectedProcedure.input(setFeedModeInput).mutation(async ({ ctx, input }) => {
    await ctx.db
      .insert(userSettings)
      .values({ ownerId: ctx.session.user.id, feedMode: input.feedMode })
      .onConflictDoUpdate({
        target: userSettings.ownerId,
        set: { feedMode: input.feedMode },
      });
  }),

  setThreshold: protectedProcedure.input(setThresholdInput).mutation(async ({ ctx, input }) => {
    await ctx.db
      .insert(userSettings)
      .values({ ownerId: ctx.session.user.id, creatorThreshold: input.creatorThreshold })
      .onConflictDoUpdate({
        target: userSettings.ownerId,
        set: { creatorThreshold: input.creatorThreshold },
      });
  }),

  addException: protectedProcedure.input(exceptionInput).mutation(async ({ ctx, input }) => {
    const ownerId = ctx.session.user.id;
    const [followed] = await ctx.db
      .select({ igUserId: following.igUserId })
      .from(following)
      .where(and(eq(following.ownerId, ownerId), eq(following.igUserId, input.igUserId)));
    if (!followed) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Account is not followed" });
    }
    await ctx.db
      .insert(feedExceptions)
      .values({ ownerId, igUserId: input.igUserId })
      .onConflictDoNothing();
  }),

  removeException: protectedProcedure.input(exceptionInput).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(feedExceptions)
      .where(
        and(
          eq(feedExceptions.ownerId, ctx.session.user.id),
          eq(feedExceptions.igUserId, input.igUserId),
        ),
      );
  }),
});

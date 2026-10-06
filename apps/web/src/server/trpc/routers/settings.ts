import { feedExceptions, feedModes, following, userSettings } from "@nodistraction/db";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { BUDGET_CHOICES, isBudgetMinutes, lockExpiry } from "@/lib/budget";
import {
  loadBudgetState,
  loadSettings,
  MAX_RECENCY_DAYS,
  MIN_RECENCY_DAYS,
} from "@/lib/sync/settings";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

const MAX_THRESHOLD = 1_000_000_000;

const feedModeSchema = z.enum(feedModes);

const settingsOutput = z.compile(
  z.object({
    feedMode: feedModeSchema,
    creatorThreshold: z.number(),
    recencyDays: z.number(),
    grayscaleMedia: z.boolean(),
    sessionBudgetMinutes: z.number().nullable(),
    budgetLockedUntil: z.number().nullable(),
    exceptions: z.array(z.object({ igUserId: z.string(), username: z.string().nullable() })),
  }),
);

const MAX_FOLLOWING_RESULTS = 50;

const followingInput = z.compile(z.object({ search: z.string().trim().max(64).default("") }));

const followingOutput = z.compile(
  z.array(
    z.object({
      igUserId: z.string(),
      username: z.string(),
      avatarUrl: z.string().nullable(),
    }),
  ),
);

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const setFeedModeInput = z.compile(z.object({ feedMode: feedModeSchema }));
const setThresholdInput = z.compile(
  z.object({ creatorThreshold: z.number().int().min(0).max(MAX_THRESHOLD) }),
);
const setRecencyDaysInput = z.compile(
  z.object({ recencyDays: z.number().int().min(MIN_RECENCY_DAYS).max(MAX_RECENCY_DAYS) }),
);
const setGrayscaleInput = z.compile(z.object({ grayscaleMedia: z.boolean() }));
const setBudgetInput = z.compile(
  z.object({
    sessionBudgetMinutes: z
      .number()
      .int()
      .refine(isBudgetMinutes, { message: `Expected one of ${BUDGET_CHOICES.join(", ")}` })
      .nullable(),
  }),
);
const lockOutput = z.compile(z.object({ budgetLockedUntil: z.number() }));
const exceptionInput = z.compile(z.object({ igUserId: z.string().regex(/^\d{1,20}$/) }));

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.output(settingsOutput).query(async ({ ctx }) => {
    const ownerId = ctx.session.user.id;
    const [settings, budget] = await Promise.all([
      loadSettings(ctx.db, ownerId),
      loadBudgetState(ctx.db, ownerId),
    ]);
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
      ...budget,
      exceptions: exceptionRows.map((row) => ({
        igUserId: row.igUserId,
        username: usernames.get(row.igUserId) ?? null,
      })),
    };
  }),

  following: protectedProcedure
    .input(followingInput)
    .output(followingOutput)
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          igUserId: following.igUserId,
          username: following.username,
          avatarUrl: following.avatarUrl,
        })
        .from(following)
        .where(
          and(
            eq(following.ownerId, ctx.session.user.id),
            input.search === ""
              ? undefined
              : sql`lower(${following.username}) like ${`%${escapeLike(input.search.toLowerCase())}%`} escape '\\'`,
          ),
        )
        .orderBy(asc(following.username))
        .limit(MAX_FOLLOWING_RESULTS),
    ),

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

  setRecencyDays: protectedProcedure.input(setRecencyDaysInput).mutation(async ({ ctx, input }) => {
    await ctx.db
      .insert(userSettings)
      .values({ ownerId: ctx.session.user.id, recencyDays: input.recencyDays })
      .onConflictDoUpdate({
        target: userSettings.ownerId,
        set: { recencyDays: input.recencyDays },
      });
  }),

  setGrayscaleMedia: protectedProcedure
    .input(setGrayscaleInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(userSettings)
        .values({ ownerId: ctx.session.user.id, grayscaleMedia: input.grayscaleMedia })
        .onConflictDoUpdate({
          target: userSettings.ownerId,
          set: { grayscaleMedia: input.grayscaleMedia },
        });
    }),

  setSessionBudget: protectedProcedure.input(setBudgetInput).mutation(async ({ ctx, input }) => {
    await ctx.db
      .insert(userSettings)
      .values({ ownerId: ctx.session.user.id, sessionBudgetMinutes: input.sessionBudgetMinutes })
      .onConflictDoUpdate({
        target: userSettings.ownerId,
        set: { sessionBudgetMinutes: input.sessionBudgetMinutes },
      });
  }),

  lockBudget: protectedProcedure.output(lockOutput).mutation(async ({ ctx }) => {
    const ownerId = ctx.session.user.id;
    const { sessionBudgetMinutes } = await loadBudgetState(ctx.db, ownerId);
    if (sessionBudgetMinutes === null) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No session budget is set" });
    }
    const budgetLockedUntil = lockExpiry(ctx.sync.now().getTime());
    await ctx.db
      .update(userSettings)
      .set({ budgetLockedUntil: new Date(budgetLockedUntil) })
      .where(eq(userSettings.ownerId, ownerId));
    return { budgetLockedUntil };
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

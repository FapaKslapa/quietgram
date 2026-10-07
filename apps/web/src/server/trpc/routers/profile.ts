import { z } from "zod";
import { loadCachedProfile, loadProfile, loadProfilePosts } from "@/lib/sync/profile";
import { guarded } from "@/server/trpc/errors";
import { userIdSchema } from "@/server/trpc/ids";
import { createTRPCRouter, protectedProcedure, syncDepsOf } from "@/server/trpc/init";
import { serveWithFallback } from "@/server/trpc/stale";

const READ_FAILURE = "Non riesco a leggere il profilo";

const getInput = z.compile(z.object({ userId: userIdSchema }));

const postsInput = z.compile(
  z.object({ userId: userIdSchema, cursor: z.string().min(1).max(512).nullish() }),
);

const profileOutput = z.compile(
  z.object({
    profile: z.object({
      id: z.string(),
      username: z.string(),
      fullName: z.string(),
      biography: z.string(),
      avatarUrl: z.string().nullable(),
      isPrivate: z.boolean(),
      isVerified: z.boolean(),
      isBusiness: z.boolean(),
      followerCount: z.number(),
      followingCount: z.number(),
      mediaCount: z.number(),
      externalUrl: z.string().nullable(),
      friendship: z.object({ following: z.boolean(), followedBy: z.boolean() }),
    }),
    stale: z.boolean(),
  }),
);

const postsOutput = z.compile(
  z.object({
    posts: z.array(
      z.object({
        id: z.string(),
        code: z.string().nullable(),
        productType: z.string(),
        authorId: z.string(),
        authorUsername: z.string(),
        caption: z.string().nullable(),
        takenAt: z.number(),
        liked: z.boolean(),
        saved: z.boolean(),
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
    nextCursor: z.string().nullable(),
  }),
);

export const profileRouter = createTRPCRouter({
  get: protectedProcedure
    .input(getInput)
    .output(profileOutput)
    .query(({ ctx, input }) =>
      guarded(async () => {
        const ownerId = ctx.session.user.id;
        const served = await serveWithFallback(
          "profile.get",
          () => loadProfile(syncDepsOf(ctx), ownerId, input.userId),
          () => loadCachedProfile(ctx.db, ownerId, input.userId),
        );
        return { profile: served.value, stale: served.stale };
      }, READ_FAILURE),
    ),

  posts: protectedProcedure
    .input(postsInput)
    .output(postsOutput)
    .query(({ ctx, input }) =>
      guarded(
        () =>
          loadProfilePosts(
            syncDepsOf(ctx),
            ctx.session.user.id,
            input.userId,
            input.cursor ?? null,
          ),
        READ_FAILURE,
      ),
    ),
});

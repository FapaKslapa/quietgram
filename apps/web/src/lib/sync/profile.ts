import { type Db, profileCache } from "@nodistraction/db";
import type { IgPost, IgProfile, UserPostsPage } from "@nodistraction/ig";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { refreshStaleAvatars } from "@/lib/sync/avatars";
import { isWithinWindow, PROFILE_COOLDOWN_MS } from "@/lib/sync/cooldown";
import type { SyncDeps } from "@/lib/sync/deps";
import { loadPostStates } from "@/lib/sync/post-state";
import { withIgSession } from "@/lib/sync/session";

const profileSchema = z.compile(
  z.object({
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
);

const readCached = async (
  db: Db,
  ownerId: string,
  userId: string,
): Promise<{ profile: IgProfile; fetchedAt: Date } | null> => {
  const [row] = await db
    .select()
    .from(profileCache)
    .where(and(eq(profileCache.ownerId, ownerId), eq(profileCache.userId, userId)));
  if (!row) return null;
  const parsed = profileSchema.safeParse(JSON.parse(row.json));
  return parsed.success ? { profile: parsed.data, fetchedAt: row.fetchedAt } : null;
};

export const loadProfile = async (
  deps: SyncDeps,
  ownerId: string,
  userId: string,
): Promise<IgProfile> => {
  const cached = await readCached(deps.db, ownerId, userId);
  if (cached && isWithinWindow(cached.fetchedAt, deps.now(), PROFILE_COOLDOWN_MS)) {
    return cached.profile;
  }
  const profile = await withIgSession(deps, ownerId, ({ source }) => source.userProfile(userId));
  const fetchedAt = deps.now();
  const json = JSON.stringify(profile);
  await deps.db
    .insert(profileCache)
    .values({ ownerId, userId, json, fetchedAt })
    .onConflictDoUpdate({
      target: [profileCache.ownerId, profileCache.userId],
      set: { json, fetchedAt },
    });
  await refreshStaleAvatars(
    deps.db,
    ownerId,
    [{ userId, username: profile.username, avatarUrl: profile.avatarUrl }],
    fetchedAt,
  );
  return profile;
};

export const loadCachedProfile = async (
  db: Db,
  ownerId: string,
  userId: string,
): Promise<IgProfile | null> => (await readCached(db, ownerId, userId))?.profile ?? null;

export type ProfilePost = IgPost & { liked: boolean; saved: boolean };

export type ProfilePostsPage = { posts: ProfilePost[]; nextCursor: string | null };

export const loadProfilePosts = async (
  deps: SyncDeps,
  ownerId: string,
  userId: string,
  cursor: string | null,
): Promise<ProfilePostsPage> => {
  const page: UserPostsPage = await withIgSession(deps, ownerId, ({ source }) =>
    source.profilePosts(userId, cursor),
  );
  const states = await loadPostStates(
    deps.db,
    ownerId,
    page.posts.map((post) => post.id),
  );
  return {
    posts: page.posts.map((post) => ({
      ...post,
      liked: states.get(post.id)?.liked ?? false,
      saved: states.get(post.id)?.saved ?? false,
    })),
    nextCursor: page.nextCursor,
  };
};

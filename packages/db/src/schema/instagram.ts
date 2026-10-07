import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "#db/schema/auth";

export const igSessions = sqliteTable("ig_sessions", {
  ownerId: text("owner_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  igUserId: text("ig_user_id").notNull(),
  cipher: text("cipher").notNull(),
  iv: text("iv").notNull(),
  status: text("status", { enum: ["active", "expired"] }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const mutuals = sqliteTable(
  "mutuals",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    igUserId: text("ig_user_id").notNull(),
    username: text("username").notNull(),
    avatarUrl: text("avatar_url"),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.igUserId] })],
);

export const following = sqliteTable(
  "following",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    igUserId: text("ig_user_id").notNull(),
    username: text("username").notNull(),
    avatarUrl: text("avatar_url"),
    avatarRefreshedAt: integer("avatar_refreshed_at", { mode: "timestamp_ms" }),
    followerCount: integer("follower_count"),
    isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
    isBusiness: integer("is_business", { mode: "boolean" }).notNull().default(false),
    countsRefreshedAt: integer("counts_refreshed_at", { mode: "timestamp_ms" }),
    postsCheckedAt: integer("posts_checked_at", { mode: "timestamp_ms" }),
    lastPostAt: integer("last_post_at", { mode: "timestamp_ms" }),
    latestReelMedia: integer("latest_reel_media"),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.igUserId] })],
);

export const storyTray = sqliteTable(
  "story_tray",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    username: text("username").notNull(),
    avatarUrl: text("avatar_url"),
    latestReelMedia: integer("latest_reel_media"),
    seen: integer("seen", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull().default(0),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.userId] })],
);

export const profileCache = sqliteTable(
  "profile_cache",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    json: text("json").notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.userId] })],
);

export const pairingTokens = sqliteTable("pairing_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
});

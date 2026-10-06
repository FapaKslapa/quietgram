import { relations, sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const passkey = sqliteTable(
  "passkey",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
    transports: text("transports"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    aaguid: text("aaguid"),
  },
  (table) => [
    index("passkey_userId_idx").on(table.userId),
    index("passkey_credentialID_idx").on(table.credentialID),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  passkeys: many(passkey),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id],
  }),
}));
export const syncState = sqliteTable("sync_state", {
  ownerId: text("owner_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  lastRefreshAt: integer("last_refresh_at", { mode: "timestamp_ms" }),
  mutualsRefreshedAt: integer("mutuals_refreshed_at", { mode: "timestamp_ms" }),
});

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

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").notNull(),
    shortcode: text("shortcode"),
    productType: text("product_type"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull(),
    authorUsername: text("author_username").notNull(),
    caption: text("caption"),
    takenAt: integer("taken_at", { mode: "timestamp_ms" }).notNull(),
    mediaJson: text("media_json").notNull(),
    seen: integer("seen", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.id] }), index("posts_feed").on(t.ownerId, t.takenAt)],
);

export const saved = sqliteTable(
  "saved",
  {
    id: text("id").notNull(),
    shortcode: text("shortcode"),
    productType: text("product_type"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    authorUsername: text("author_username").notNull(),
    caption: text("caption"),
    mediaJson: text("media_json").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.id] })],
);

export const dmThreads = sqliteTable(
  "dm_threads",
  {
    id: text("id").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    lastActivityAt: integer("last_activity_at", { mode: "timestamp_ms" }).notNull(),
    unread: integer("unread", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.id] })],
);

export const dmMessages = sqliteTable(
  "dm_messages",
  {
    id: text("id").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull(),
    senderId: text("sender_id").notNull(),
    text: text("text"),
    kind: text("kind", { enum: ["text", "photo", "video", "voice", "other"] })
      .notNull()
      .default("text"),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.id] }),
    index("dm_thread").on(t.ownerId, t.threadId, t.sentAt),
  ],
);

export const dmSyncMarks = sqliteTable(
  "dm_sync_marks",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.scope] })],
);

export const feedModes = ["friends", "following", "creators"] as const;

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

export const userSettings = sqliteTable("user_settings", {
  ownerId: text("owner_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  feedMode: text("feed_mode", { enum: feedModes }).notNull().default("friends"),
  creatorThreshold: integer("creator_threshold").notNull().default(10000),
  recencyDays: integer("recency_days").notNull().default(14),
  grayscaleMedia: integer("grayscale_media", { mode: "boolean" }).notNull().default(false),
  sessionBudgetMinutes: integer("session_budget_minutes"),
  budgetLockedUntil: integer("budget_locked_until", { mode: "timestamp_ms" }),
  dmSendEnabled: integer("dm_send_enabled", { mode: "boolean" }).notNull().default(false),
  interactionsEnabled: integer("interactions_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
});

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

export const postState = sqliteTable(
  "post_state",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: text("media_id").notNull(),
    liked: integer("liked", { mode: "boolean" }).notNull().default(false),
    saved: integer("saved", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.mediaId] })],
);

export const feedExceptions = sqliteTable(
  "feed_exceptions",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    igUserId: text("ig_user_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.igUserId] })],
);

export const syncRuns = sqliteTable("sync_runs", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  kind: text("kind", { enum: ["refresh", "keepalive"] })
    .notNull()
    .default("refresh"),
  status: text("status", { enum: ["running", "done", "failed"] }).notNull(),
  total: integer("total").notNull(),
  completed: integer("completed").notNull(),
  state: text("state"),
});

export const pairingTokens = sqliteTable("pairing_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
});

import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const syncState = sqliteTable("sync_state", {
  ownerId: text("owner_id").primaryKey(),
  lastRefreshAt: integer("last_refresh_at", { mode: "timestamp_ms" }),
  mutualsRefreshedAt: integer("mutuals_refreshed_at", { mode: "timestamp_ms" }),
});

export const igSessions = sqliteTable("ig_sessions", {
  ownerId: text("owner_id").primaryKey(),
  igUserId: text("ig_user_id").notNull(),
  cipher: text("cipher").notNull(),
  iv: text("iv").notNull(),
  status: text("status", { enum: ["active", "expired"] }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const mutuals = sqliteTable(
  "mutuals",
  {
    ownerId: text("owner_id").notNull(),
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
    ownerId: text("owner_id").notNull(),
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
    ownerId: text("owner_id").notNull(),
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
    ownerId: text("owner_id").notNull(),
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
    ownerId: text("owner_id").notNull(),
    threadId: text("thread_id").notNull(),
    senderId: text("sender_id").notNull(),
    text: text("text"),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.id] }),
    index("dm_thread").on(t.ownerId, t.threadId, t.sentAt),
  ],
);

export const syncRuns = sqliteTable("sync_runs", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  status: text("status", { enum: ["running", "done", "failed"] }).notNull(),
  total: integer("total").notNull(),
  completed: integer("completed").notNull(),
});

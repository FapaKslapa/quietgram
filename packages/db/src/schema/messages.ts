import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "#db/schema/auth";

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

import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "#db/schema/auth";

export const feedModes = ["friends", "following", "creators"] as const;

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

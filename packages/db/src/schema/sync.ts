import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "#db/schema/auth";

export const syncState = sqliteTable("sync_state", {
  ownerId: text("owner_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  lastRefreshAt: integer("last_refresh_at", { mode: "timestamp_ms" }),
  mutualsRefreshedAt: integer("mutuals_refreshed_at", { mode: "timestamp_ms" }),
});

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
  leaseUntil: integer("lease_until", { mode: "timestamp_ms" }),
});

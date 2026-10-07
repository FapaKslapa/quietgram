import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "#db/schema/auth";

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
  (t) => [
    primaryKey({ columns: [t.ownerId, t.id] }),
    index("posts_feed").on(t.ownerId, t.takenAt, t.id),
  ],
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

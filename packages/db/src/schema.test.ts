import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

const migrationsDir = join(import.meta.dirname, "../migrations");

const migrate = (database: DatabaseSync) => {
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    for (const statement of readFileSync(join(migrationsDir, file), "utf8").split(
      "--> statement-breakpoint",
    )) {
      database.exec(statement);
    }
  }
};

describe("schema migration", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    migrate(database);
  });

  it("creates every table", () => {
    const rows = database
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like '\\_%' escape '\\'",
      )
      .all();
    expect(rows.map((row) => row.name).sort()).toEqual([
      "dm_messages",
      "dm_threads",
      "ig_sessions",
      "mutuals",
      "posts",
      "saved",
      "sync_runs",
      "sync_state",
    ]);
  });

  it("stores and reads a post with defaults", () => {
    database
      .prepare(
        "insert into posts (id, owner_id, author_id, author_username, caption, taken_at, media_json) values (?, ?, ?, ?, ?, ?, ?)",
      )
      .run("p1", "owner", "a1", "user_a", null, 1_700_000_000_000, "[]");
    const post = database
      .prepare("select * from posts where owner_id = ? and id = ?")
      .get("owner", "p1");
    expect(post).toMatchObject({ id: "p1", caption: null, seen: 0, media_json: "[]" });
  });

  it("rejects a duplicate post for the same owner", () => {
    const insert = database.prepare(
      "insert into posts (id, owner_id, author_id, author_username, taken_at, media_json) values (?, ?, ?, ?, ?, ?)",
    );
    insert.run("p1", "owner", "a1", "user_a", 1, "[]");
    expect(() => insert.run("p1", "owner", "a1", "user_a", 1, "[]")).toThrow();
  });
});

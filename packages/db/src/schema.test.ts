import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { migrate } from "#db/testing";

describe("schema migration", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    migrate(database);
    database
      .prepare("insert into user (id, name, email) values (?, ?, ?)")
      .run("owner", "Owner", "owner@example.com");
  });

  it("creates every table", () => {
    const rows = database
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like '\\_%' escape '\\'",
      )
      .all();
    expect(rows.map((row) => row.name).sort()).toEqual([
      "account",
      "dm_messages",
      "dm_threads",
      "ig_sessions",
      "mutuals",
      "pairing_tokens",
      "passkey",
      "posts",
      "saved",
      "session",
      "sync_runs",
      "sync_state",
      "user",
      "verification",
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

  it("rejects rows owned by an unknown user", () => {
    expect(() =>
      database
        .prepare(
          "insert into posts (id, owner_id, author_id, author_username, taken_at, media_json) values (?, ?, ?, ?, ?, ?)",
        )
        .run("p1", "ghost", "a1", "user_a", 1, "[]"),
    ).toThrow();
  });
});

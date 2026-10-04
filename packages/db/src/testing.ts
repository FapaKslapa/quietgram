import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { Db } from "#db/client";
import * as schema from "#db/schema";

const migrationsDir = join(import.meta.dirname, "../migrations");

export const migrate = (database: DatabaseSync): void => {
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

export const createTestDb = (): Db => {
  const database = new DatabaseSync(":memory:");
  migrate(database);
  return drizzle(
    async (sql, params, method) => {
      const statement = database.prepare(sql);
      if (method === "run") {
        statement.run(...params);
        return { rows: [] };
      }
      statement.setReturnArrays(true);
      const rows = statement.all(...params).map((row) => (Array.isArray(row) ? row : []));
      return { rows: method === "get" ? (rows[0] ?? []) : rows };
    },
    { schema },
  );
};

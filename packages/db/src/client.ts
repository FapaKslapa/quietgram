import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "#db/schema";

type SchemaBatch = DrizzleD1Database<typeof schema>["batch"];

export type Db = BaseSQLiteDatabase<"async", unknown, typeof schema> & { batch: SchemaBatch };

export type BatchStatement = Parameters<SchemaBatch>[0][number];

export const createDb = (d1: D1Database): Db => drizzle(d1, { schema });

export const runBatch = async (db: Db, statements: BatchStatement[]): Promise<void> => {
  const [first, ...rest] = statements;
  if (first === undefined) return;
  await db.batch([first, ...rest]);
};
export * from "#db/schema";
export { schema };

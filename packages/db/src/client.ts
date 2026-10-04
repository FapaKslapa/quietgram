import { drizzle } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "#db/schema";

export type Db = BaseSQLiteDatabase<"async", unknown, typeof schema>;

export const createDb = (d1: D1Database): Db => drizzle(d1, { schema });
export * from "#db/schema";
export { schema };

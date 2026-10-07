import { type Db, postState } from "@nodistraction/db";
import { and, eq, inArray } from "drizzle-orm";

export type PostFlagsMap = Map<string, { liked: boolean; saved: boolean }>;

export const loadPostStates = async (
  db: Db,
  ownerId: string,
  mediaIds: string[],
): Promise<PostFlagsMap> => {
  if (mediaIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(postState)
    .where(and(eq(postState.ownerId, ownerId), inArray(postState.mediaId, mediaIds)));
  return new Map(rows.map((row) => [row.mediaId, { liked: row.liked, saved: row.saved }]));
};

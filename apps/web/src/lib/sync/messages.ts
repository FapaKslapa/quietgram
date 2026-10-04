import { type Db, dmMessages, dmThreads } from "@nodistraction/db";
import {
  fetchInbox,
  fetchThread,
  type IgMessage,
  type IgThread,
  SessionExpiredError,
  sendText,
  validateDmText,
} from "@nodistraction/ig";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { chunkRows } from "@/lib/sync/chunk";
import type { SyncDeps } from "@/lib/sync/deps";
import { MessageSendError } from "@/lib/sync/errors";
import { withIgSession } from "@/lib/sync/session";

const LOCAL_ID_PREFIX = "local-";

export type StoredThread = IgThread & { preview: string | null };
export type StoredMessage = Omit<IgMessage, "type">;

export const syncInbox = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  const threads = await withIgSession(deps, ownerId, ({ requester }) => fetchInbox(requester));
  for (const group of chunkRows(threads, 5)) {
    await deps.db
      .insert(dmThreads)
      .values(
        group.map((thread) => ({
          ...thread,
          ownerId,
          lastActivityAt: new Date(thread.lastActivityAt),
        })),
      )
      .onConflictDoUpdate({
        target: [dmThreads.ownerId, dmThreads.id],
        set: {
          title: sql`excluded.title`,
          lastActivityAt: sql`excluded.last_activity_at`,
          unread: sql`excluded.unread`,
        },
      });
  }
};

export const syncThread = async (
  deps: SyncDeps,
  ownerId: string,
  threadId: string,
): Promise<void> => {
  const messages = await withIgSession(deps, ownerId, ({ requester }) =>
    fetchThread(requester, threadId),
  );
  await deps.db
    .delete(dmMessages)
    .where(
      and(
        eq(dmMessages.ownerId, ownerId),
        eq(dmMessages.threadId, threadId),
        like(dmMessages.id, `${LOCAL_ID_PREFIX}%`),
      ),
    );
  for (const group of chunkRows(messages, 6)) {
    await deps.db
      .insert(dmMessages)
      .values(
        group.map((message) => ({
          id: message.id,
          ownerId,
          threadId,
          senderId: message.senderId,
          text: message.text,
          sentAt: new Date(message.sentAt),
        })),
      )
      .onConflictDoNothing();
  }
};

export const listThreads = async (db: Db, ownerId: string): Promise<StoredThread[]> => {
  const preview = sql<
    string | null
  >`(select m.text from dm_messages m where m.owner_id = ${dmThreads.ownerId} and m.thread_id = ${dmThreads.id} order by m.sent_at desc limit 1)`;
  const rows = await db
    .select({
      id: dmThreads.id,
      title: dmThreads.title,
      lastActivityAt: dmThreads.lastActivityAt,
      unread: dmThreads.unread,
      preview,
    })
    .from(dmThreads)
    .where(eq(dmThreads.ownerId, ownerId))
    .orderBy(desc(dmThreads.lastActivityAt));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    lastActivityAt: row.lastActivityAt.getTime(),
    unread: row.unread,
    preview: row.preview,
  }));
};

export const listMessages = async (
  db: Db,
  ownerId: string,
  threadId: string,
): Promise<StoredMessage[]> => {
  const rows = await db
    .select()
    .from(dmMessages)
    .where(and(eq(dmMessages.ownerId, ownerId), eq(dmMessages.threadId, threadId)))
    .orderBy(asc(dmMessages.sentAt));
  return rows.map((row) => ({
    id: row.id,
    senderId: row.senderId,
    text: row.text,
    sentAt: row.sentAt.getTime(),
  }));
};

export const sendMessage = async (
  deps: SyncDeps,
  ownerId: string,
  input: { threadId: string; text: string },
): Promise<StoredMessage> => {
  const text = validateDmText(input.text);
  const sentAt = deps.now();
  const senderId = await withIgSession(deps, ownerId, async ({ requester, igUserId }) => {
    try {
      await sendText(requester, input.threadId, text);
    } catch (error) {
      if (error instanceof SessionExpiredError) throw error;
      throw new MessageSendError(error);
    }
    return igUserId;
  });
  const message = {
    id: `${LOCAL_ID_PREFIX}${crypto.randomUUID()}`,
    senderId,
    text,
    sentAt: sentAt.getTime(),
  };
  await deps.db
    .insert(dmMessages)
    .values({ ...message, ownerId, threadId: input.threadId, sentAt });
  await deps.db
    .update(dmThreads)
    .set({ lastActivityAt: sentAt })
    .where(and(eq(dmThreads.ownerId, ownerId), eq(dmThreads.id, input.threadId)));
  return message;
};

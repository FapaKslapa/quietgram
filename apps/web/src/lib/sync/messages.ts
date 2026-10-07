import { type Db, dmMessages, dmThreads, runBatch } from "@nodistraction/db";
import {
  type IgMessage,
  IgRejectedError,
  type IgThread,
  IgThrottledError,
  SessionExpiredError,
  validateDmText,
} from "@nodistraction/ig";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { chunkRows } from "@/lib/sync/chunk";
import { MESSAGES_COOLDOWN_MS } from "@/lib/sync/cooldown";
import type { SyncDeps } from "@/lib/sync/deps";
import { MessageSendError } from "@/lib/sync/errors";
import { isFresh, markSynced } from "@/lib/sync/marks";
import { withIgSession } from "@/lib/sync/session";

const LOCAL_ID_PREFIX = "local-";

const INBOX_SCOPE = "inbox";
const threadScope = (threadId: string): string => `thread:${threadId}`;

export type StoredThread = IgThread & {
  preview: string | null;
  previewKind: IgMessage["kind"] | null;
};
export type StoredMessage = Omit<IgMessage, "type">;

export const syncInbox = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  if (await isFresh(deps, ownerId, INBOX_SCOPE, MESSAGES_COOLDOWN_MS)) return;
  const threads = await withIgSession(deps, ownerId, ({ source }) => source.inbox());
  await runBatch(
    deps.db,
    chunkRows(threads, 5).map((group) =>
      deps.db
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
        }),
    ),
  );
  await markSynced(deps, ownerId, INBOX_SCOPE);
};

export const syncThread = async (
  deps: SyncDeps,
  ownerId: string,
  threadId: string,
): Promise<void> => {
  if (await isFresh(deps, ownerId, threadScope(threadId), MESSAGES_COOLDOWN_MS)) return;
  const messages = await withIgSession(deps, ownerId, ({ source }) => source.thread(threadId));
  await runBatch(deps.db, [
    deps.db
      .delete(dmMessages)
      .where(
        and(
          eq(dmMessages.ownerId, ownerId),
          eq(dmMessages.threadId, threadId),
          like(dmMessages.id, `${LOCAL_ID_PREFIX}%`),
        ),
      ),
    ...chunkRows(messages, 7).map((group) =>
      deps.db
        .insert(dmMessages)
        .values(
          group.map((message) => ({
            id: message.id,
            ownerId,
            threadId,
            senderId: message.senderId,
            text: message.text,
            kind: message.kind,
            sentAt: new Date(message.sentAt),
          })),
        )
        .onConflictDoNothing(),
    ),
  ]);
  await markSynced(deps, ownerId, threadScope(threadId));
};

export const listThreads = async (db: Db, ownerId: string): Promise<StoredThread[]> => {
  const preview = sql<
    string | null
  >`(select m.text from dm_messages m where m.owner_id = ${dmThreads.ownerId} and m.thread_id = ${dmThreads.id} order by m.sent_at desc limit 1)`;
  const previewKind = sql<
    IgMessage["kind"] | null
  >`(select m.kind from dm_messages m where m.owner_id = ${dmThreads.ownerId} and m.thread_id = ${dmThreads.id} order by m.sent_at desc limit 1)`;
  const rows = await db
    .select({
      id: dmThreads.id,
      title: dmThreads.title,
      lastActivityAt: dmThreads.lastActivityAt,
      unread: dmThreads.unread,
      preview,
      previewKind,
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
    previewKind: row.previewKind,
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
    kind: row.kind,
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
  const senderId = await withIgSession(deps, ownerId, async ({ source, igUserId }) => {
    try {
      await source.sendText(input.threadId, text);
    } catch (error) {
      if (
        error instanceof SessionExpiredError ||
        error instanceof IgRejectedError ||
        error instanceof IgThrottledError
      ) {
        throw error;
      }
      throw new MessageSendError(error);
    }
    return igUserId;
  });
  const message = {
    id: `${LOCAL_ID_PREFIX}${crypto.randomUUID()}`,
    senderId,
    text,
    kind: "text" as const,
    sentAt: sentAt.getTime(),
  };
  await runBatch(deps.db, [
    deps.db.insert(dmMessages).values({ ...message, ownerId, threadId: input.threadId, sentAt }),
    deps.db
      .update(dmThreads)
      .set({ lastActivityAt: sentAt })
      .where(and(eq(dmThreads.ownerId, ownerId), eq(dmThreads.id, input.threadId))),
  ]);
  return message;
};

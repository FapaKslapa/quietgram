import type { Requester } from "#ig/request";
import { inboxPageSchema, sendResponseSchema, threadPageSchema } from "#ig/schemas";

export type IgThread = { id: string; title: string; lastActivityAt: number; unread: boolean };

export type IgMessageKind = "text" | "photo" | "video" | "voice" | "other";

export type IgMessage = {
  id: string;
  senderId: string;
  type: string;
  kind: IgMessageKind;
  text: string | null;
  sentAt: number;
};

const MAX_DM_LENGTH = 1000;

export const kindOfItemType = (itemType: string, text: string | null): IgMessageKind => {
  if (text !== null && text.length > 0) return "text";
  if (itemType === "voice_media") return "voice";
  if (itemType === "media" || itemType === "raw_media") return "photo";
  return "other";
};

const microsToMillis = (micros: number): number => Math.floor(micros / 1000);

export const validateDmText = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new RangeError("Message is empty");
  if (trimmed.length > MAX_DM_LENGTH) throw new RangeError("Message is too long");
  return trimmed;
};

export const fetchInbox = async (requester: Requester): Promise<IgThread[]> => {
  const page = inboxPageSchema.parse(await requester.get("/api/v1/direct_v2/inbox/"));
  return page.inbox.threads.map((thread) => ({
    id: thread.thread_id,
    title: thread.thread_title ?? "",
    lastActivityAt: microsToMillis(thread.last_activity_at),
    unread: (thread.read_state ?? 0) > 0,
  }));
};

export const fetchThread = async (requester: Requester, threadId: string): Promise<IgMessage[]> => {
  const page = threadPageSchema.parse(
    await requester.get(`/api/v1/direct_v2/threads/${threadId}/`),
  );
  return page.thread.items.map((item) => ({
    id: item.item_id,
    senderId: item.user_id,
    type: item.item_type,
    kind: kindOfItemType(item.item_type, item.text ?? null),
    text: item.text ?? null,
    sentAt: microsToMillis(item.timestamp),
  }));
};

export const sendText = async (
  requester: Requester,
  threadId: string,
  text: string,
): Promise<void> => {
  const validated = validateDmText(text);
  const clientContext = crypto.randomUUID();
  const response = await requester.postForm("/api/v1/direct_v2/threads/broadcast/text/", {
    action: "send_item",
    thread_ids: JSON.stringify([threadId]),
    text: validated,
    client_context: clientContext,
    mutation_token: clientContext,
    offline_threading_id: clientContext,
  });
  sendResponseSchema.parse(response);
};

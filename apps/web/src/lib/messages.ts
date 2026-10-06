import { dayKey, formatClock, formatDayLabel } from "@/lib/time";

export const MAX_MESSAGE_LENGTH = 1000;
export const COUNTER_THRESHOLD = 900;

export type MessageKind = "text" | "photo" | "video" | "voice" | "other";

export type ThreadMessage = {
  id: string;
  senderId: string;
  text: string | null;
  kind: MessageKind;
  sentAt: number;
  clientKey?: string;
};

export type ConversationItem =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "message";
      key: string;
      mine: boolean;
      text: string | null;
      attachment: string | null;
      time: string;
      first: boolean;
      last: boolean;
    };

export const SYNC_GUARD_MS = 60_000;

export const canSyncView = (lastSyncAt: number | null, now: number): boolean =>
  lastSyncAt === null || now - lastSyncAt >= SYNC_GUARD_MS;

const ATTACHMENT_LABELS: Record<MessageKind, string | null> = {
  text: null,
  photo: "Foto",
  video: "Video",
  voice: "Messaggio vocale",
  other: "Allegato",
};

export const attachmentLabel = (kind: MessageKind): string | null => ATTACHMENT_LABELS[kind];

export const threadPreview = (preview: string | null, previewKind: MessageKind | null): string =>
  preview ?? (previewKind === null ? null : attachmentLabel(previewKind)) ?? "Nessun messaggio";

export const canSend = (text: string): boolean => {
  const length = text.trim().length;
  return length > 0 && length <= MAX_MESSAGE_LENGTH;
};

export const canSubmit = (text: string, enabled: boolean): boolean => enabled && canSend(text);

export const SEND_OFF_HINT = "Invio disattivato: attivalo in Profilo";

export const composerHint = (enabled: boolean): string | null => (enabled ? null : SEND_OFF_HINT);

export const showCounter = (text: string): boolean => text.length >= COUNTER_THRESHOLD;

export const remainingCharacters = (text: string): number => MAX_MESSAGE_LENGTH - text.length;

export const counterLabel = (text: string): string => String(remainingCharacters(text));

export const isOverLimit = (text: string): boolean => remainingCharacters(text) < 0;

const hasContent = (message: ThreadMessage): boolean =>
  (message.text !== null && message.text.length > 0) || attachmentLabel(message.kind) !== null;

export const buildConversation = (
  messages: ThreadMessage[],
  viewerId: string | null,
  now: number,
): ConversationItem[] => {
  const visible = messages.filter(hasContent);
  const items: ConversationItem[] = [];
  let currentDay: string | null = null;
  visible.forEach((message, index) => {
    const day = dayKey(message.sentAt);
    if (day !== currentDay) {
      currentDay = day;
      items.push({ kind: "day", key: `day-${day}`, label: formatDayLabel(message.sentAt, now) });
    }
    const previous = visible[index - 1];
    const next = visible[index + 1];
    const joinsPrevious =
      previous !== undefined &&
      previous.senderId === message.senderId &&
      dayKey(previous.sentAt) === day;
    const joinsNext =
      next !== undefined && next.senderId === message.senderId && dayKey(next.sentAt) === day;
    const text = message.text !== null && message.text.length > 0 ? message.text : null;
    items.push({
      kind: "message",
      key: message.clientKey ?? message.id,
      mine: viewerId !== null && message.senderId === viewerId,
      text,
      attachment: text === null ? attachmentLabel(message.kind) : null,
      time: formatClock(message.sentAt),
      first: !joinsPrevious,
      last: !joinsNext,
    });
  });
  return items;
};

export const appendUnique = (messages: ThreadMessage[], message: ThreadMessage): ThreadMessage[] =>
  messages.some((item) => item.id === message.id) ? messages : [...messages, message];

export const sendFailureMessage = (error: unknown): string => {
  const data =
    typeof error === "object" && error !== null
      ? (error as { data?: { failure?: { reason?: string } | null; code?: string } | null }).data
      : null;
  const reason = data?.failure?.reason;
  if ((reason === "rejected" || reason === "throttled") && error instanceof Object) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  if (data?.code === "PRECONDITION_FAILED" && reason === undefined) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  if (reason === "session_expired" || reason === "no_session") {
    return "La sessione con Instagram è scaduta. Rinnovala dall'estensione e riprova.";
  }
  if (reason === "invalid_message" || data?.code === "BAD_REQUEST") {
    return "Il messaggio non è valido: scrivi da 1 a 1000 caratteri.";
  }
  return "Non sono riuscito a inviare il messaggio. Il testo è rimasto qui: riprova.";
};

export const threadLabel = (title: string, unread: boolean): string =>
  unread ? `${title}, messaggi non letti` : title;

const PENDING_PREFIX = "pending-";

export const createPending = (viewerId: string, text: string, now: number): ThreadMessage => {
  const id = `${PENDING_PREFIX}${crypto.randomUUID()}`;
  return { id, clientKey: id, senderId: viewerId, text, kind: "text", sentAt: now };
};

export const isPending = (message: ThreadMessage): boolean => message.id.startsWith(PENDING_PREFIX);

export const mergeThread = (server: ThreadMessage[], current: ThreadMessage[]): ThreadMessage[] => [
  ...server,
  ...current.filter(isPending),
];

export const settlePending = (
  messages: ThreadMessage[],
  pendingId: string,
  sent: ThreadMessage,
): ThreadMessage[] =>
  messages.map((message) =>
    message.id === pendingId ? { ...sent, clientKey: message.clientKey ?? message.id } : message,
  );

export const dropMessage = (messages: ThreadMessage[], id: string): ThreadMessage[] =>
  messages.filter((message) => message.id !== id);

const CONVERSATION_PATH = /^\/messaggi\/[^/]+\/?$/;

export const isConversationPath = (pathname: string): boolean => CONVERSATION_PATH.test(pathname);

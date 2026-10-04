import { dayKey, formatClock, formatDayLabel } from "@/lib/time";

export const MAX_MESSAGE_LENGTH = 1000;
export const COUNTER_THRESHOLD = 900;

export type ThreadMessage = {
  id: string;
  senderId: string;
  text: string | null;
  sentAt: number;
};

export type ConversationItem =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; mine: boolean; text: string; time: string };

export const canSend = (text: string): boolean => {
  const length = text.trim().length;
  return length > 0 && length <= MAX_MESSAGE_LENGTH;
};

export const showCounter = (text: string): boolean => text.length >= COUNTER_THRESHOLD;

export const remainingCharacters = (text: string): number => MAX_MESSAGE_LENGTH - text.length;

export const counterLabel = (text: string): string => String(remainingCharacters(text));

export const isOverLimit = (text: string): boolean => remainingCharacters(text) < 0;

export const buildConversation = (
  messages: ThreadMessage[],
  viewerId: string | null,
  now: number,
): ConversationItem[] => {
  const items: ConversationItem[] = [];
  let currentDay: string | null = null;
  for (const message of messages) {
    if (message.text === null || message.text.length === 0) continue;
    const day = dayKey(message.sentAt);
    if (day !== currentDay) {
      currentDay = day;
      items.push({ kind: "day", key: `day-${day}`, label: formatDayLabel(message.sentAt, now) });
    }
    items.push({
      kind: "message",
      key: message.id,
      mine: viewerId !== null && message.senderId === viewerId,
      text: message.text,
      time: formatClock(message.sentAt),
    });
  }
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

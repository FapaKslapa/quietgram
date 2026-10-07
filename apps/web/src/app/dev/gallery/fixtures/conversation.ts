import { LONG_WORD } from "@/app/dev/gallery/fixtures/media";
import { HOUR, MINUTE, NOW } from "@/app/dev/gallery/fixtures/time";
import { buildConversation, type ThreadMessage } from "@/lib/messages";

const VIEWER = "me";

const text = (id: string, senderId: string, body: string, sentAt: number): ThreadMessage => ({
  id,
  senderId,
  text: body,
  kind: "text",
  sentAt,
});

const attachment = (
  id: string,
  senderId: string,
  kind: ThreadMessage["kind"],
  sentAt: number,
): ThreadMessage => ({ id, senderId, text: null, kind, sentAt });

const MESSAGES: ThreadMessage[] = [
  text("m1", "other", "Ciao! Sei libero stasera?", NOW - 26 * HOUR),
  text("m1b", "other", "Ho pensato a una cosa.", NOW - 26 * HOUR + 20_000),
  text("m2", VIEWER, "Credo di sì, che cosa hai in mente?", NOW - 26 * HOUR + MINUTE),
  text(
    "m3",
    "other",
    "Pensavo a una cena leggera e poi una passeggiata. Conosco un posto nuovo vicino al fiume, hanno anche il tavolo fuori.",
    NOW - 25 * HOUR,
  ),
  attachment("m3b", "other", "photo", NOW - 25 * HOUR + MINUTE),
  attachment("m3c", "other", "voice", NOW - 25 * HOUR + 2 * MINUTE),
  text("m4", VIEWER, "Ottima idea.", NOW - 20 * MINUTE),
  text("m4b", VIEWER, LONG_WORD, NOW - 19 * MINUTE),
  attachment("m4c", "other", "video", NOW - 5 * MINUTE),
  text("m5", "other", "Ci vediamo alle otto davanti al cinema?", NOW - 4 * MINUTE),
];

export const CONVERSATION = buildConversation(MESSAGES, VIEWER, NOW);
export const PENDING_KEYS: ReadonlySet<string> = new Set(["m4b"]);

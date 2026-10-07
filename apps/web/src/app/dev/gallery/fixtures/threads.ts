import { LONG_WORD } from "@/app/dev/gallery/fixtures/media";
import { HOUR, MINUTE, NOW } from "@/app/dev/gallery/fixtures/time";
import type { ThreadSummary } from "@/components/messaggi/thread-row";

export const THREADS: ThreadSummary[] = [
  {
    id: "t1",
    title: "Giulia Rossi",
    lastActivityAt: NOW - 4 * MINUTE,
    unread: true,
    preview: "Ci vediamo alle otto davanti al cinema?",
    previewKind: "text",
  },
  {
    id: "t2",
    title: "Marco B.",
    lastActivityAt: NOW - 26 * HOUR,
    unread: false,
    preview: "Perfetto, grazie mille",
    previewKind: "text",
  },
  {
    id: "t3",
    title: "Gruppo montagna",
    lastActivityAt: NOW - 4 * 24 * HOUR,
    unread: true,
    preview: null,
    previewKind: "photo",
  },
  {
    id: "t4",
    title: "Sara M.",
    lastActivityAt: NOW - 9 * 24 * HOUR,
    unread: false,
    preview: null,
    previewKind: "voice",
  },
];

export const LONG_TITLE = "Maria Concetta Alessandra De Santis Rossi Bianchi Verdi Neri";

export const LONG_THREADS: ThreadSummary[] = [
  {
    id: "l1",
    title: LONG_TITLE,
    lastActivityAt: NOW - 4 * MINUTE,
    unread: true,
    preview:
      "Ti scrivo un messaggio molto molto lungo per vedere che cosa succede quando l'anteprima non entra nella riga e deve essere tagliata",
    previewKind: "text",
  },
  {
    id: "l2",
    title: LONG_WORD,
    lastActivityAt: NOW - 26 * HOUR,
    unread: false,
    preview: LONG_WORD,
    previewKind: "text",
  },
  {
    id: "l3",
    title: "https://www.instagram.com/p/Cabcdefghijklmnopqrstuvwxyz0123456789/",
    lastActivityAt: NOW - 3 * 24 * HOUR,
    unread: false,
    preview: null,
    previewKind: "video",
  },
];

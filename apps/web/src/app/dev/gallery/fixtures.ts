import type { ThreadSummary } from "@/components/messaggi/thread-row";
import type { ModeSettings } from "@/components/posta/mode-sheet";
import type { FeedPost } from "@/components/posta/post-card";
import type { PostMediaItem } from "@/components/posta/post-media";
import { buildConversation, type ThreadMessage } from "@/lib/messages";
import type { SavedItem } from "@/lib/saved-grid";

export const NOW = Date.UTC(2026, 9, 7, 14, 30);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const scene = (sky: string, ground: string, sun: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="${sky}"/><circle cx="560" cy="330" r="120" fill="${sun}"/><path d="M0 700 Q200 560 400 680 T800 640 V1000 H0Z" fill="${ground}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const image = (sky: string, ground: string, sun: string): PostMediaItem => ({
  kind: "image",
  url: scene(sky, ground, sun),
  width: 800,
  height: 1000,
});

const video: PostMediaItem = {
  kind: "video",
  url: "data:video/mp4;base64,AAAA",
  width: 800,
  height: 1000,
};

const LONG_CAPTION =
  "Weekend in montagna con gli amici di sempre. Siamo partiti all'alba, abbiamo camminato per ore fino al rifugio e poi abbiamo mangiato polenta e formaggi guardando le nuvole scendere sulla valle. Alla sera una partita a carte, due chitarre e nessun telefono. Torneremo presto, magari con la neve, se il meteo ci aiuta.\n\nGrazie a tutti per la compagnia e per le risate.";

export const POSTS: FeedPost[] = [
  {
    id: "p1",
    authorId: "1",
    authorUsername: "giulia.r",
    authorAvatarUrl: null,
    caption: "Colazione sul balcone.",
    takenAt: NOW - 12 * MINUTE,
    media: [image("#e8c9a0", "#8a5a3b", "#fff3d6")],
  },
  {
    id: "p2",
    authorId: "2",
    authorUsername: "marco_b",
    authorAvatarUrl: null,
    caption: LONG_CAPTION,
    takenAt: NOW - 5 * HOUR,
    media: [
      image("#9ec5e8", "#2f5d3a", "#ffffff"),
      image("#d8b4e2", "#3b3b6b", "#fff1b8"),
      image("#f4a6a0", "#5b2b2b", "#ffe9c2"),
    ],
  },
  {
    id: "p3",
    authorId: "3",
    authorUsername: "panificio.nino",
    authorAvatarUrl: null,
    caption: null,
    takenAt: NOW - 26 * HOUR,
    media: [video],
  },
  {
    id: "p4",
    authorId: "4",
    authorUsername: "ristorante.da.nino",
    authorAvatarUrl: null,
    caption: "Il menu di stasera.",
    takenAt: NOW - 3 * 24 * HOUR,
    media: [image("#c7e0c4", "#35563b", "#fffbe0")],
  },
];

export const SAVED: SavedItem[] = [
  {
    id: "s1",
    authorUsername: "giulia.r",
    caption: "Colazione sul balcone.",
    media: POSTS[0]?.media ?? [],
  },
  { id: "s2", authorUsername: "marco_b", caption: LONG_CAPTION, media: POSTS[1]?.media ?? [] },
  { id: "s3", authorUsername: "panificio.nino", caption: null, media: [video] },
  { id: "s4", authorUsername: "ristorante.da.nino", caption: null, media: POSTS[3]?.media ?? [] },
  {
    id: "s5",
    authorUsername: "luca.t",
    caption: null,
    media: [image("#b7d3f2", "#27425e", "#ffffff")],
  },
  {
    id: "s6",
    authorUsername: "sara.m",
    caption: null,
    media: [image("#f2d7b7", "#5e4327", "#fff6df")],
  },
];

export const THREADS: ThreadSummary[] = [
  {
    id: "t1",
    title: "Giulia Rossi",
    lastActivityAt: NOW - 4 * MINUTE,
    unread: true,
    preview: "Ci vediamo alle otto davanti al cinema?",
  },
  {
    id: "t2",
    title: "Marco B.",
    lastActivityAt: NOW - 26 * HOUR,
    unread: false,
    preview: "Perfetto, grazie mille",
  },
  {
    id: "t3",
    title: "Gruppo montagna",
    lastActivityAt: NOW - 4 * 24 * HOUR,
    unread: false,
    preview: null,
  },
];

const VIEWER = "me";

const MESSAGES: ThreadMessage[] = [
  { id: "m1", senderId: "other", text: "Ciao! Sei libero stasera?", sentAt: NOW - 26 * HOUR },
  {
    id: "m2",
    senderId: VIEWER,
    text: "Credo di sì, che cosa hai in mente?",
    sentAt: NOW - 26 * HOUR + MINUTE,
  },
  {
    id: "m3",
    senderId: "other",
    text: "Pensavo a una cena leggera e poi una passeggiata. Conosco un posto nuovo vicino al fiume, hanno anche il tavolo fuori.",
    sentAt: NOW - 25 * HOUR,
  },
  { id: "m4", senderId: VIEWER, text: "Ottima idea.", sentAt: NOW - 20 * MINUTE },
  {
    id: "m5",
    senderId: "other",
    text: "Ci vediamo alle otto davanti al cinema?",
    sentAt: NOW - 4 * MINUTE,
  },
];

export const CONVERSATION = buildConversation(MESSAGES, VIEWER, NOW);
export const PENDING_KEYS: ReadonlySet<string> = new Set(["m4"]);

export const SETTINGS: ModeSettings = {
  feedMode: "friends",
  creatorThreshold: 50_000,
  recencyDays: 14,
  exceptions: [
    { igUserId: "11", username: "panificio.nino" },
    { igUserId: "12", username: "sara.m" },
  ],
};

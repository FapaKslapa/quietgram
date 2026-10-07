import type { ThreadSummary } from "@/components/messaggi/thread-row";
import type { ModeSettings } from "@/components/posta/mode-sheet";
import type { FeedPost } from "@/components/posta/post-card";
import type { AccountProfile, ProfilePost } from "@/lib/account";
import type { CommentRow } from "@/lib/comments";
import type { PostMediaItem } from "@/lib/media";
import { buildConversation, type ThreadMessage } from "@/lib/messages";
import type { SavedItem } from "@/lib/saved-grid";
import type { StoryItem, TrayEntry } from "@/lib/stories";

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

export const AVATAR_A = "http://localhost:3000/dev/avatar-a.svg";
export const AVATAR_B = "http://localhost:3000/dev/avatar-b.svg";

const LONG_CAPTION =
  "Weekend in montagna con gli amici di sempre. Siamo partiti all'alba, abbiamo camminato per ore fino al rifugio e poi abbiamo mangiato polenta e formaggi guardando le nuvole scendere sulla valle. Alla sera una partita a carte, due chitarre e nessun telefono. Torneremo presto, magari con la neve, se il meteo ci aiuta.\n\nGrazie a tutti per la compagnia e per le risate.";

export const POSTS: FeedPost[] = [
  {
    id: "p1",
    authorId: "1",
    authorUsername: "giulia.r",
    authorAvatarUrl: AVATAR_A,
    liked: true,
    saved: false,
    caption: "Colazione sul balcone.",
    takenAt: NOW - 12 * MINUTE,
    media: [image("#e8c9a0", "#8a5a3b", "#fff3d6")],
  },
  {
    id: "p2",
    shortcode: "Cabc123xyz",
    productType: "feed",
    authorId: "2",
    authorUsername: "marco_b",
    authorAvatarUrl: AVATAR_B,
    liked: false,
    saved: true,
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
    liked: false,
    saved: false,
    caption: null,
    takenAt: NOW - 26 * HOUR,
    media: [video],
  },
  {
    id: "p4",
    authorId: "4",
    authorUsername: "ristorante.da.nino",
    authorAvatarUrl: null,
    liked: false,
    saved: false,
    caption: "Il menu di stasera.",
    takenAt: NOW - 3 * 24 * HOUR,
    media: [image("#c7e0c4", "#35563b", "#fffbe0")],
  },
];

export const SAVED: SavedItem[] = [
  {
    id: "s1",
    authorUsername: "giulia.r",
    authorAvatarUrl: AVATAR_A,
    caption: "Colazione sul balcone.",
    media: POSTS[0]?.media ?? [],
  },
  {
    id: "s2",
    shortcode: "Cabc123xyz",
    productType: "feed",
    authorUsername: "marco_b",
    authorAvatarUrl: AVATAR_B,
    caption: LONG_CAPTION,
    media: POSTS[1]?.media ?? [],
  },
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

const LONG_WORD = "supercalifragilistichespiralidosoannidiamicizia".repeat(3);

export const LONG_THREADS: ThreadSummary[] = [
  {
    id: "l1",
    title: "Maria Concetta Alessandra De Santis Rossi Bianchi Verdi Neri",
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

export const SETTINGS: ModeSettings = {
  feedMode: "friends",
  creatorThreshold: 50_000,
  recencyDays: 14,
  exceptions: [
    { igUserId: "11", username: "panificio.nino" },
    { igUserId: "12", username: "sara.m" },
  ],
};

export const TRAY: TrayEntry[] = [
  { userId: "1", username: "giulia.r", avatarUrl: AVATAR_A, latestReelMedia: NOW, seen: false },
  { userId: "2", username: "marco_b", avatarUrl: AVATAR_B, latestReelMedia: NOW, seen: false },
  { userId: "3", username: "panificio.nino", avatarUrl: null, latestReelMedia: NOW, seen: false },
  { userId: "5", username: "luca.t", avatarUrl: null, latestReelMedia: NOW, seen: true },
  { userId: "6", username: "sara.m", avatarUrl: AVATAR_A, latestReelMedia: NOW, seen: true },
  {
    userId: "7",
    username: "ristorante.da.nino",
    avatarUrl: null,
    latestReelMedia: NOW,
    seen: true,
  },
];

const story = (id: string, ageMinutes: number, media: PostMediaItem): StoryItem => ({
  id,
  takenAt: NOW - ageMinutes * MINUTE,
  expiresAt: NOW + 20 * HOUR,
  media,
  productType: "story",
});

export const STORY_ITEMS: StoryItem[] = [
  story("st1", 95, image("#e8c9a0", "#8a5a3b", "#fff3d6")),
  story("st2", 62, image("#9ec5e8", "#2f5d3a", "#ffffff")),
  story("st3", 14, image("#d8b4e2", "#3b3b6b", "#fff1b8")),
];

export const COMMENTS: CommentRow[] = [
  {
    id: "c1",
    userId: "2",
    username: "marco_b",
    avatarUrl: AVATAR_B,
    text: "Che posto stupendo, ci siamo stati anche noi l'estate scorsa.",
    createdAt: NOW - 3 * HOUR,
    likeCount: 12,
    parentId: null,
  },
  {
    id: "c2",
    userId: "1",
    username: "giulia.r",
    avatarUrl: AVATAR_A,
    text: "Grazie! Torniamo a settembre, vieni con noi?",
    createdAt: NOW - 2 * HOUR,
    likeCount: 3,
    parentId: "c1",
  },
  {
    id: "c3",
    userId: "5",
    username: "luca.t",
    avatarUrl: null,
    text: "Colori incredibili.",
    createdAt: NOW - 26 * HOUR,
    likeCount: 0,
    parentId: null,
  },
  {
    id: "c4",
    userId: "6",
    username: "sara.m",
    avatarUrl: null,
    text: "Mi hai fatto venire fame solo a guardarla, la prossima volta portami con te e prometto di non lamentarmi per la salita.",
    createdAt: NOW - 30 * HOUR,
    likeCount: 1_240,
    parentId: null,
  },
];

export const ACCOUNT: AccountProfile & { avatarUrl: string | null } = {
  username: "giulia.r",
  fullName: "Giulia Rossi",
  biography: "Fotografa a Torino.\nColazioni, montagna e luce del mattino.",
  avatarUrl: AVATAR_A,
  isPrivate: false,
  isVerified: true,
  followerCount: 12_430,
  followingCount: 380,
  mediaCount: 1_204,
  friendship: { following: true, followedBy: false },
};

const profilePost = (id: string, media: PostMediaItem[]): ProfilePost => ({
  id,
  code: null,
  productType: "feed",
  authorUsername: "giulia.r",
  caption: null,
  media,
});

export const ACCOUNT_POSTS: ProfilePost[] = [
  profilePost("a1", POSTS[0]?.media ?? []),
  profilePost("a2", POSTS[1]?.media ?? []),
  profilePost("a3", [video]),
  profilePost("a4", POSTS[3]?.media ?? []),
  profilePost("a5", [image("#b7d3f2", "#27425e", "#ffffff")]),
  profilePost("a6", [image("#f2d7b7", "#5e4327", "#fff6df")]),
];

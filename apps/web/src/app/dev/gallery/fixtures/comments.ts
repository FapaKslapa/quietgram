import { AVATAR_A, AVATAR_B } from "@/app/dev/gallery/fixtures/media";
import { HOUR, NOW } from "@/app/dev/gallery/fixtures/time";
import type { CommentRow } from "@/lib/comments";

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

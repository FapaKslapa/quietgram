import {
  AVATAR_A,
  AVATAR_B,
  DUSK,
  EMBER,
  LONG_CAPTION,
  MEADOW,
  MORNING,
  MOUNTAIN,
  VIDEO,
} from "@/app/dev/gallery/fixtures/media";
import { HOUR, MINUTE, NOW } from "@/app/dev/gallery/fixtures/time";
import type { FeedPost } from "@/components/posta/post-card";

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
    media: [MORNING],
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
    media: [MOUNTAIN, DUSK, EMBER],
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
    media: [VIDEO],
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
    media: [MEADOW],
  },
];

export const FIRST_POST = POSTS.slice(0, 1);
export const CAROUSEL_POST = POSTS.slice(1, 2);

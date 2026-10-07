import {
  AVATAR_A,
  AVATAR_B,
  DUSK,
  EMBER,
  LAKE,
  LONG_CAPTION,
  MEADOW,
  MORNING,
  MOUNTAIN,
  SAND,
  VIDEO,
} from "@/app/dev/gallery/fixtures/media";
import type { SavedItem } from "@/lib/saved-grid";

export const SAVED: SavedItem[] = [
  {
    id: "s1",
    authorUsername: "giulia.r",
    authorAvatarUrl: AVATAR_A,
    caption: "Colazione sul balcone.",
    media: [MORNING],
  },
  {
    id: "s2",
    shortcode: "Cabc123xyz",
    productType: "feed",
    authorUsername: "marco_b",
    authorAvatarUrl: AVATAR_B,
    caption: LONG_CAPTION,
    media: [MOUNTAIN, DUSK, EMBER],
  },
  { id: "s3", authorUsername: "panificio.nino", caption: null, media: [VIDEO] },
  { id: "s4", authorUsername: "ristorante.da.nino", caption: null, media: [MEADOW] },
  { id: "s5", authorUsername: "luca.t", caption: null, media: [LAKE] },
  { id: "s6", authorUsername: "sara.m", caption: null, media: [SAND] },
];

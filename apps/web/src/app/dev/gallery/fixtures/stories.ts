import { AVATAR_A, AVATAR_B, DUSK, MORNING, MOUNTAIN } from "@/app/dev/gallery/fixtures/media";
import { HOUR, MINUTE, NOW } from "@/app/dev/gallery/fixtures/time";
import type { PostMediaItem } from "@/lib/media";
import type { StoryItem, TrayEntry } from "@/lib/stories";

const entry = (
  userId: string,
  username: string,
  avatarUrl: string | null,
  seen: boolean,
): TrayEntry => ({ userId, username, avatarUrl, latestReelMedia: NOW, seen });

export const TRAY: TrayEntry[] = [
  entry("1", "giulia.r", AVATAR_A, false),
  entry("2", "marco_b", AVATAR_B, false),
  entry("3", "panificio.nino", null, false),
  entry("5", "luca.t", null, true),
  entry("6", "sara.m", AVATAR_A, true),
  entry("7", "ristorante.da.nino", null, true),
];

const story = (id: string, ageMinutes: number, media: PostMediaItem): StoryItem => ({
  id,
  takenAt: NOW - ageMinutes * MINUTE,
  expiresAt: NOW + 20 * HOUR,
  media,
  productType: "story",
});

export const STORY_ITEMS: StoryItem[] = [
  story("st1", 95, MORNING),
  story("st2", 62, MOUNTAIN),
  story("st3", 14, DUSK),
];

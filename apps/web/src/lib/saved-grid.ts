import type { LetterMediaItem } from "@/components/posta/letter-media";

export type SavedItem = {
  id: string;
  authorUsername: string;
  caption: string | null;
  media: LetterMediaItem[];
};

export type SavedBadge = { kind: "video" } | { kind: "carousel"; count: number } | null;

export const coverOf = (item: SavedItem): LetterMediaItem | null => item.media[0] ?? null;

export const badgeOf = (item: SavedItem): SavedBadge => {
  if (item.media.length > 1) return { kind: "carousel", count: item.media.length };
  return item.media[0]?.kind === "video" ? { kind: "video" } : null;
};

export const savedLabel = (item: SavedItem): string => {
  const badge = badgeOf(item);
  const base = `Post salvato di ${item.authorUsername}`;
  if (badge?.kind === "video") return `${base}, video`;
  if (badge?.kind === "carousel") return `${base}, ${badge.count} foto`;
  return base;
};

export const shouldAutoSync = (itemCount: number, alreadyTried: boolean): boolean =>
  itemCount === 0 && !alreadyTried;

export const findSaved = (items: SavedItem[], id: string | null): SavedItem | null =>
  id === null ? null : (items.find((item) => item.id === id) ?? null);

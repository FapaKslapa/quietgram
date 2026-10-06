import type { PostMediaItem } from "@/lib/media";

export type SavedItem = {
  id: string;
  shortcode?: string | null | undefined;
  productType?: string | null | undefined;
  authorUsername: string;
  caption: string | null;
  media: PostMediaItem[];
};

export type SavedBadge = { kind: "video" } | { kind: "carousel"; count: number } | null;

export const coverOf = (item: SavedItem): PostMediaItem | null => item.media[0] ?? null;

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

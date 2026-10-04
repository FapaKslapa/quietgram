import { hashString } from "@/lib/hash";

export const AVATAR_COLORS = [
  "#b04a33",
  "#2f6f8f",
  "#566638",
  "#7b3f8f",
  "#9a4f2a",
  "#5f539c",
] as const;

export const avatarColor = (authorId: string): string =>
  AVATAR_COLORS[hashString(authorId) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];

export const initialsOf = (username: string): string => {
  const parts = username.split(/[._\s-]+/).filter((part) => part.length > 0);
  const [first = "", second = ""] = parts;
  const letters = second ? `${first.charAt(0)}${second.charAt(0)}` : first.slice(0, 2);
  return letters.toUpperCase();
};

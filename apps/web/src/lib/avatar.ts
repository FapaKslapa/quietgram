import { initialsOf } from "@/lib/author";

const REMOTE_URL = /^https?:\/\//i;

export const avatarSource = (url: string | null | undefined): string | null => {
  const trimmed = url?.trim() ?? "";
  return REMOTE_URL.test(trimmed) ? trimmed : null;
};

export const avatarInitials = (name: string): string => {
  const initials = initialsOf(name.trim());
  return initials === "" ? "?" : initials;
};

export const showAvatarImage = (source: string | null, failedSource: string | null): boolean =>
  source !== null && source !== failedSource;

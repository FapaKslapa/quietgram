export const VIEWS = [
  "posta",
  "posta-running",
  "posta-empty",
  "posta-loading",
  "modes-friends",
  "modes-creators",
  "expired",
  "expired-error",
  "messaggi",
  "messaggi-empty",
  "thread",
  "thread-failed",
  "salvati",
  "salvati-empty",
  "salvati-open",
  "profilo",
  "login",
  "register",
  "pair",
  "error",
] as const;

export type GalleryViewName = (typeof VIEWS)[number];

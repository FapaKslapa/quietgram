import { classifyRefreshError } from "@/lib/refresh-failure";

export const LOGIN_FALLBACK = "Non sono riuscito ad accedere. Riprova tra poco.";
export const LOGIN_WAIT = "Hai appena provato: aspetta qualche secondo e riprova.";
export const LOGIN_THROTTLED =
  "Instagram ti chiede di aspettare qualche minuto. Riprova tra un po'.";

type ErrorShape = {
  message?: string;
  data?: { failure?: { reason: string } | null } | null;
};

const SERVER_REASONS = new Set([
  "login_challenge",
  "login_bad_password",
  "login_wrong_account",
  "login_unavailable",
]);

export const loginErrorMessage = (error: unknown): string => {
  const kind = classifyRefreshError(error).kind;
  if (kind === "cooldown") return LOGIN_WAIT;
  if (kind === "throttled") return LOGIN_THROTTLED;
  const shape = typeof error === "object" && error !== null ? (error as ErrorShape) : null;
  const reason = shape?.data?.failure?.reason;
  if (reason !== undefined && SERVER_REASONS.has(reason) && shape?.message) return shape.message;
  return LOGIN_FALLBACK;
};

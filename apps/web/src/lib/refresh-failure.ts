export type RefreshFailure =
  | { kind: "cooldown"; seconds: number }
  | { kind: "expired" }
  | { kind: "other" };

type FailureShape = {
  data?: {
    code?: string;
    failure?: { reason: string; retryAfterSeconds?: number } | null;
  } | null;
};

const DEFAULT_COOLDOWN_SECONDS = 60;

export const classifyRefreshError = (error: unknown): RefreshFailure => {
  const data = typeof error === "object" && error !== null ? (error as FailureShape).data : null;
  const reason = data?.failure?.reason;
  if (reason === "cooldown" || data?.code === "TOO_MANY_REQUESTS") {
    return {
      kind: "cooldown",
      seconds: data?.failure?.retryAfterSeconds ?? DEFAULT_COOLDOWN_SECONDS,
    };
  }
  if (reason === "session_expired" || reason === "no_session") return { kind: "expired" };
  return { kind: "other" };
};

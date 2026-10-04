import {
  IgHttpError,
  IgRejectedError,
  IgThrottledError,
  SessionExpiredError,
} from "@nodistraction/ig";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { THROTTLE_COOLDOWN_MS } from "@/lib/sync/cooldown";
import {
  CooldownError,
  MessageSendError,
  NoSessionError,
  RunNotFoundError,
} from "@/lib/sync/errors";

export type FailureReason =
  | "cooldown"
  | "session_expired"
  | "no_session"
  | "run_not_found"
  | "instagram_error"
  | "rejected"
  | "throttled"
  | "invalid_message";

export type FailureData = { reason: FailureReason; retryAfterSeconds?: number };

export const describeFailure = (cause: unknown): FailureData | null => {
  if (cause instanceof CooldownError) {
    return { reason: "cooldown", retryAfterSeconds: cause.retryAfterSeconds };
  }
  if (cause instanceof SessionExpiredError) return { reason: "session_expired" };
  if (cause instanceof IgThrottledError) {
    return { reason: "throttled", retryAfterSeconds: THROTTLE_COOLDOWN_MS / 1000 };
  }
  if (cause instanceof IgRejectedError) return { reason: "rejected" };
  if (cause instanceof NoSessionError) return { reason: "no_session" };
  if (cause instanceof RunNotFoundError) return { reason: "run_not_found" };
  if (
    cause instanceof IgHttpError ||
    cause instanceof ZodError ||
    cause instanceof MessageSendError
  ) {
    return { reason: "instagram_error" };
  }
  if (cause instanceof RangeError) return { reason: "invalid_message" };
  return null;
};

const codeFor = (reason: FailureReason | undefined): TRPCError["code"] => {
  switch (reason) {
    case "cooldown":
    case "throttled":
      return "TOO_MANY_REQUESTS";
    case "session_expired":
    case "no_session":
      return "PRECONDITION_FAILED";
    case "run_not_found":
      return "NOT_FOUND";
    case "instagram_error":
    case "rejected":
      return "BAD_GATEWAY";
    case "invalid_message":
      return "BAD_REQUEST";
    case undefined:
      return "INTERNAL_SERVER_ERROR";
  }
};

const THROTTLE_MESSAGE = "Instagram ti chiede di aspettare qualche minuto. Riprova tra un po'.";

const messageFor = (error: unknown): string => {
  if (error instanceof IgThrottledError) return THROTTLE_MESSAGE;
  if (error instanceof IgRejectedError) {
    return error.reason === null
      ? "Instagram ha rifiutato il messaggio."
      : `Instagram ha rifiutato il messaggio: ${error.reason}`;
  }
  return error instanceof Error ? error.message : "Unexpected failure";
};

export const toTRPCError = (error: unknown): TRPCError => {
  if (error instanceof TRPCError) return error;
  const message = messageFor(error);
  return new TRPCError({
    code: codeFor(describeFailure(error)?.reason),
    message,
    cause: error,
  });
};

export const guarded = async <T>(task: () => Promise<T>): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    throw toTRPCError(error);
  }
};

import {
  EngineInteractionsDisabledError,
  EngineResponseError,
  EngineSendDisabledError,
  EngineUnreachableError,
  IgHttpError,
  IgRejectedError,
  IgThrottledError,
  IgUnsupportedError,
  SessionExpiredError,
} from "@nodistraction/ig";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { THROTTLE_COOLDOWN_MS } from "@/lib/sync/cooldown";
import {
  CooldownError,
  InteractionsDisabledError,
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
  | "invalid_message"
  | "interactions_disabled";

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
  if (cause instanceof InteractionsDisabledError) return { reason: "interactions_disabled" };
  if (
    cause instanceof IgHttpError ||
    cause instanceof EngineResponseError ||
    cause instanceof EngineSendDisabledError ||
    cause instanceof EngineInteractionsDisabledError ||
    cause instanceof IgUnsupportedError ||
    cause instanceof EngineUnreachableError ||
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
    case "interactions_disabled":
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

const INTERACTIONS_DISABLED_MESSAGE = "Le interazioni sono disattivate: attivale in Profilo.";

const THROTTLE_MESSAGE = "Instagram ti chiede di aspettare qualche minuto. Riprova tra un po'.";

export const shortReason = (error: unknown): string | null => {
  if (error instanceof EngineUnreachableError) return `il motore non risponde (${error.reason})`;
  if (error instanceof EngineResponseError) return `risposta non valida (${error.reason})`;
  if (error instanceof ZodError) return "risposta non valida";
  if (error instanceof IgHttpError) return `Instagram ha risposto ${error.status}`;
  if (error instanceof EngineSendDisabledError) return "invio disattivato sul motore";
  if (error instanceof EngineInteractionsDisabledError) {
    return "interazioni disattivate sul motore";
  }
  if (error instanceof IgUnsupportedError) return "funzione non disponibile senza il motore";
  return null;
};

const messageFor = (error: unknown, context?: string): string => {
  if (error instanceof InteractionsDisabledError) return INTERACTIONS_DISABLED_MESSAGE;
  const reason = shortReason(error);
  if (reason !== null) return context ? `${context}: ${reason}` : reason;
  if (error instanceof IgThrottledError) return THROTTLE_MESSAGE;
  if (error instanceof IgRejectedError) {
    return error.reason === null
      ? "Instagram ha rifiutato il messaggio."
      : `Instagram ha rifiutato il messaggio: ${error.reason}`;
  }
  return error instanceof Error ? error.message : "Unexpected failure";
};

export const toTRPCError = (error: unknown, context?: string): TRPCError => {
  if (error instanceof TRPCError) return error;
  const message = messageFor(error, context);
  return new TRPCError({
    code: codeFor(describeFailure(error)?.reason),
    message,
    cause: error,
  });
};

export const guarded = async <T>(task: () => Promise<T>, context?: string): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    throw toTRPCError(error, context);
  }
};

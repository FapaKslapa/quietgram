import { IgHttpError, SessionExpiredError } from "@nodistraction/ig";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { CooldownError, NoSessionError, RunNotFoundError } from "@/lib/sync/errors";

export type FailureReason =
  | "cooldown"
  | "session_expired"
  | "no_session"
  | "run_not_found"
  | "instagram_error"
  | "invalid_message";

export type FailureData = { reason: FailureReason; retryAfterSeconds?: number };

export const describeFailure = (cause: unknown): FailureData | null => {
  if (cause instanceof CooldownError) {
    return { reason: "cooldown", retryAfterSeconds: cause.retryAfterSeconds };
  }
  if (cause instanceof SessionExpiredError) return { reason: "session_expired" };
  if (cause instanceof NoSessionError) return { reason: "no_session" };
  if (cause instanceof RunNotFoundError) return { reason: "run_not_found" };
  if (cause instanceof IgHttpError || cause instanceof ZodError) {
    return { reason: "instagram_error" };
  }
  if (cause instanceof RangeError) return { reason: "invalid_message" };
  return null;
};

const codeFor = (reason: FailureReason | undefined): TRPCError["code"] => {
  switch (reason) {
    case "cooldown":
      return "TOO_MANY_REQUESTS";
    case "session_expired":
    case "no_session":
      return "PRECONDITION_FAILED";
    case "run_not_found":
      return "NOT_FOUND";
    case "instagram_error":
      return "BAD_GATEWAY";
    case "invalid_message":
      return "BAD_REQUEST";
    case undefined:
      return "INTERNAL_SERVER_ERROR";
  }
};

export const toTRPCError = (error: unknown): TRPCError => {
  if (error instanceof TRPCError) return error;
  const message = error instanceof Error ? error.message : "Unexpected failure";
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

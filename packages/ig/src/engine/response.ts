import {
  EngineInteractionsDisabledError,
  EngineResponseError,
  EngineSendDisabledError,
} from "#ig/engine/errors";
import { errorBodySchema } from "#ig/engine/schemas";
import { IgHttpError, IgThrottledError, SessionExpiredError } from "#ig/errors";

export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

type Checkable<T> = {
  safeParse: (
    value: unknown,
  ) =>
    | { success: true; data: T }
    | { success: false; error: { issues: ReadonlyArray<{ path: PropertyKey[] }> } };
};

export const check = <T>(schema: Checkable<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const path = result.error.issues[0]?.path.map(String).join(".");
  throw new EngineResponseError(path ? path : "root");
};

export const failure = (status: number, text: string): Error => {
  const body = errorBodySchema.safeParse(parseJson(text));
  const code = body.success ? body.data.code : null;
  if (status === 429 && code === "throttled") return new IgThrottledError();
  if (status === 401 && code === "session_expired") return new SessionExpiredError();
  if (status === 403 && code === "send_disabled") return new EngineSendDisabledError();
  if (status === 403 && code === "interactions_disabled")
    return new EngineInteractionsDisabledError();
  return new IgHttpError(status);
};

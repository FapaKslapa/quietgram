export type SessionStatus = "valid" | "invalid" | "unknown";

export type SessionReason =
  | "network"
  | "throttled"
  | "unreadable-body"
  | "no-user"
  | `http-${number}`;

export type SessionResult =
  | { status: "valid" | "invalid"; reason: null }
  | { status: "unknown"; reason: SessionReason };

export type SessionObservation = {
  status: number;
  redirected: boolean;
  url: string;
  body: unknown;
};

export type SessionFetch = (
  input: string,
  init: { credentials: "include"; headers: Record<string, string> },
) => Promise<Response>;

export const SESSION_CHECK_URL =
  "https://www.instagram.com/api/v1/accounts/current_user/?edit=true";

const SESSION_CHECK_HEADERS = {
  "x-ig-app-id": "936619743392459",
  "x-requested-with": "XMLHttpRequest",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const INVALID_MESSAGES = new Set(["login_required", "checkpoint_required", "challenge_required"]);

const isLoginRedirect = ({ redirected, url }: SessionObservation): boolean =>
  redirected && /\/accounts\/(login|suspended)|\/challenge\//.test(url);

const signalsInvalid = (body: unknown): boolean => {
  if (!isRecord(body)) return false;
  if (typeof body.message === "string" && INVALID_MESSAGES.has(body.message)) return true;
  return body.require_login === true || typeof body.checkpoint_url === "string";
};

const isPresent = (value: unknown): boolean =>
  (typeof value === "string" && value !== "") || typeof value === "number";

const hasUser = (body: Record<string, unknown>): boolean =>
  isRecord(body.user) &&
  (typeof body.user.username === "string" || isPresent(body.user.pk) || isPresent(body.user.id));

const verdict = (status: "valid" | "invalid"): SessionResult => ({ status, reason: null });

const unknown = (reason: SessionReason): SessionResult => ({ status: "unknown", reason });

export const classifySession = (observation: SessionObservation): SessionResult => {
  const { status, body } = observation;
  if (isLoginRedirect(observation) || signalsInvalid(body)) return verdict("invalid");
  if (status === 401 || status === 403) return verdict("invalid");
  if (status === 429) return unknown("throttled");
  if (status !== 200) return unknown(`http-${status}`);
  if (!isRecord(body)) return unknown("unreadable-body");
  if (hasUser(body) || body.status === "ok") return verdict("valid");
  return unknown("no-user");
};

const readBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

export const checkSession = async (fetcher: SessionFetch): Promise<SessionResult> => {
  try {
    const response = await fetcher(SESSION_CHECK_URL, {
      credentials: "include",
      headers: SESSION_CHECK_HEADERS,
    });
    return classifySession({
      status: response.status,
      redirected: response.redirected,
      url: response.url,
      body: await readBody(response),
    });
  } catch {
    return unknown("network");
  }
};

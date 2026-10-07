export type SessionStatus = "valid" | "invalid" | "unknown";

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

const hasUser = (body: unknown): boolean =>
  isRecord(body) && isRecord(body.user) && typeof body.user.username === "string";

export const classifySession = (observation: SessionObservation): SessionStatus => {
  if (isLoginRedirect(observation) || signalsInvalid(observation.body)) return "invalid";
  if (observation.status === 401 || observation.status === 403) return "invalid";
  if (observation.status === 200 && hasUser(observation.body)) return "valid";
  return "unknown";
};

const readBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const checkSession = async (fetcher: SessionFetch): Promise<SessionStatus> => {
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
    return "unknown";
  }
};

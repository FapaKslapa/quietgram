import { z } from "zod";
import { IgHttpError, IgRejectedError, IgThrottledError, SessionExpiredError } from "#ig/errors";

export type IgCookies = { sessionId: string; csrfToken: string; userId: string };

const BASE = "https://www.instagram.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const EXPIRED_MESSAGES = new Set(["checkpoint_required", "login_required"]);

const bodySchema = z.compile(
  z.object({
    message: z.string().nullish(),
    require_login: z.boolean().nullish(),
    spam: z.boolean().nullish(),
  }),
);

const THROTTLE_PATTERN = /wait a few minutes/i;
const THROTTLE_STATUS = 429;

const isThrottle = (status: number, json: unknown): boolean => {
  if (status === THROTTLE_STATUS) return true;
  const body = bodySchema.safeParse(json);
  return body.success && THROTTLE_PATTERN.test(body.data.message ?? "");
};

const REJECTED_STATUSES = new Set([400, 403]);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const isExpiredBody = (json: unknown): boolean => {
  const body = bodySchema.safeParse(json);
  if (!body.success) return false;
  return EXPIRED_MESSAGES.has(body.data.message ?? "");
};

const rejection = (status: number, json: unknown): IgRejectedError => {
  const body = bodySchema.safeParse(json);
  return new IgRejectedError(
    status,
    body.success ? (body.data.message ?? null) : null,
    body.success && body.data.spam === true,
  );
};

export const createRequester = (cookies: IgCookies, fetcher: typeof fetch = fetch) => {
  const headers = {
    cookie: `sessionid=${cookies.sessionId}; csrftoken=${cookies.csrfToken}; ds_user_id=${cookies.userId}`,
    "user-agent": USER_AGENT,
    "x-csrftoken": cookies.csrfToken,
    "x-ig-app-id": "936619743392459",
    "x-requested-with": "XMLHttpRequest",
    referer: `${BASE}/`,
  };

  const run = async (
    path: string,
    method: "GET" | "POST",
    extraHeaders: Record<string, string> = {},
    body?: URLSearchParams,
  ): Promise<unknown> => {
    const init: RequestInit = { method, headers: { ...headers, ...extraHeaders } };
    if (body) init.body = body;
    const response = await fetcher(`${BASE}${path}`, init);
    const text = await response.text();
    const status = response.status;
    const json = parseJson(text);
    if (isThrottle(status, json)) throw new IgThrottledError();
    if (status === 401) throw new SessionExpiredError();
    if (text.trimStart().startsWith("<")) {
      if (method === "POST" && REJECTED_STATUSES.has(status)) throw rejection(status, undefined);
      throw new SessionExpiredError();
    }
    if (isExpiredBody(json)) throw new SessionExpiredError();
    if (REJECTED_STATUSES.has(status) && json !== undefined) throw rejection(status, json);
    if (!response.ok || json === undefined) throw new IgHttpError(response.status);
    return json;
  };

  return {
    get: (path: string, params?: Record<string, string>) =>
      run(params ? `${path}?${new URLSearchParams(params)}` : path, "GET"),
    postForm: (path: string, body: Record<string, string>) =>
      run(
        path,
        "POST",
        { "content-type": "application/x-www-form-urlencoded" },
        new URLSearchParams(body),
      ),
  };
};

export type Requester = ReturnType<typeof createRequester>;

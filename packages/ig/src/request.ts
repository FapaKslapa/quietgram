import { z } from "zod";
import { IgHttpError, SessionExpiredError } from "#ig/errors";

export type IgCookies = { sessionId: string; csrfToken: string; userId: string };

const BASE = "https://www.instagram.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const EXPIRED_MESSAGES = new Set(["checkpoint_required", "login_required"]);

const messageSchema = z.compile(z.object({ message: z.string() }));

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const isExpiredBody = (json: unknown): boolean => {
  const message = messageSchema.safeParse(json);
  return message.success && EXPIRED_MESSAGES.has(message.data.message);
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
    if (response.status === 401 || response.status === 403 || text.trimStart().startsWith("<")) {
      throw new SessionExpiredError();
    }
    const json = parseJson(text);
    if (isExpiredBody(json)) throw new SessionExpiredError();
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

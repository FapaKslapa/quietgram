import { EngineUnreachableError } from "#ig/engine/errors";
import { failure, parseJson } from "#ig/engine/response";
import { signedTarget, signRequest } from "#ig/engine/sign";
import { IgHttpError } from "#ig/errors";

export type Query = ReadonlyArray<[string, string]>;

export type TransportOptions = {
  baseUrl: string;
  secret: string;
  accountId: string;
  fetcher?: typeof fetch;
  now?: () => number;
};

type Method = "GET" | "PUT" | "POST" | "DELETE";

const USER_AGENT = "nodistraction-worker/1.0";
const API_PREFIX = "/v1";

export const createTransport = (options: TransportOptions) => {
  const fetcher: typeof fetch = options.fetcher ?? ((input, init) => fetch(input, init));
  const now = options.now ?? Date.now;
  const base = options.baseUrl.replace(/\/+$/, "");

  const call = async (
    method: Method,
    path: string,
    query: Query = [],
    payload?: unknown,
  ): Promise<unknown> => {
    const target = signedTarget(`${API_PREFIX}${path}`, query);
    const body = payload === undefined ? "" : JSON.stringify(payload);
    const timestamp = String(Math.floor(now() / 1000));
    const signature = await signRequest({
      secret: options.secret,
      timestamp,
      method,
      target,
      body,
    });
    const headers: Record<string, string> = {
      "user-agent": USER_AGENT,
      "x-engine-timestamp": timestamp,
      "x-engine-signature": signature,
      "x-ig-account-id": options.accountId,
    };
    const init: RequestInit = { method, headers };
    if (payload !== undefined) {
      headers["content-type"] = "application/json";
      init.body = body;
    }
    let response: Response;
    try {
      response = await fetcher(`${base}${target}`, init);
    } catch (error) {
      throw new EngineUnreachableError(error);
    }
    const text = await response.text();
    if (!response.ok) throw failure(response.status, text);
    const json = parseJson(text);
    if (json === undefined) throw new IgHttpError(response.status);
    return json;
  };

  return call;
};

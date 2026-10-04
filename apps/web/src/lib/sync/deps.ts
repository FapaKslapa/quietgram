import type { Db } from "@nodistraction/db";
import type { IgCookies, Requester } from "@nodistraction/ig";

export type SyncRuntime = {
  getCookieKey: () => string;
  now: () => Date;
  createRequester: (cookies: IgCookies) => Requester;
  delay: () => Promise<void>;
};

export type SyncDeps = SyncRuntime & { db: Db };

export const MIN_DELAY_MS = 1000;
export const MAX_DELAY_MS = 3000;

export const randomDelay = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
  });

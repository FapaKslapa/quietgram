import type { Db } from "@nodistraction/db";
import type { IgCookies, Requester } from "@nodistraction/ig";

export type SyncRuntime = {
  getCookieKey: () => string;
  now: () => Date;
  createRequester: (cookies: IgCookies) => Requester;
  delay: () => Promise<void>;
};

export type SyncDeps = SyncRuntime & { db: Db };

const MIN_DELAY_MS = 300;
const MAX_DELAY_MS = 900;

export const randomDelay = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
  });

export const INSTAGRAM_URL = "https://www.instagram.com/";

export type CookieStore = {
  get: (details: { url: string; name: string }) => Promise<{ value: string } | null>;
};

export type InstagramCookies = { sessionId: string; csrfToken: string; userId: string };

export const readInstagramCookies = async (
  store: CookieStore,
): Promise<InstagramCookies | null> => {
  const read = async (name: string) => (await store.get({ url: INSTAGRAM_URL, name }))?.value;
  const [sessionId, csrfToken, userId] = await Promise.all([
    read("sessionid"),
    read("csrftoken"),
    read("ds_user_id"),
  ]);
  return sessionId && csrfToken && userId ? { sessionId, csrfToken, userId } : null;
};

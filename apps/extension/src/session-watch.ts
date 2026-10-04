export const isSessionChange = (cookie: { name: string; domain: string }): boolean =>
  cookie.name === "sessionid" &&
  (cookie.domain === "instagram.com" || cookie.domain.endsWith(".instagram.com"));

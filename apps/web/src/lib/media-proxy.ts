export const MEDIA_ROUTE = "/api/media";
export const MAX_MEDIA_URL_LENGTH = 2048;
export const MAX_MEDIA_REDIRECTS = 3;

const ALLOWED_SUFFIXES = [".cdninstagram.com", ".fbcdn.net"] as const;
const ALLOWED_TYPES = /^(image|video)\//i;

export const isAllowedMediaHost = (hostname: string): boolean =>
  ALLOWED_SUFFIXES.some(
    (suffix) => hostname.length > suffix.length && hostname.toLowerCase().endsWith(suffix),
  );

export const parseMediaTarget = (raw: string | null | undefined): URL | null => {
  const value = raw?.trim() ?? "";
  if (value === "" || value.length > MAX_MEDIA_URL_LENGTH) return null;
  if (!value.toLowerCase().startsWith("https://")) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  if (url.port !== "") return null;
  if (!isAllowedMediaHost(url.hostname)) return null;
  return url;
};

export const isAllowedMediaType = (contentType: string | null): boolean =>
  contentType !== null && ALLOWED_TYPES.test(contentType.trim());

export const mediaSrc = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  const target = parseMediaTarget(url);
  if (!target) return url;
  return `${MEDIA_ROUTE}?u=${encodeURIComponent(target.href)}`;
};

const encoder = new TextEncoder();

const toHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (data: string): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", encoder.encode(data)));

const hmacSha256Hex = async (secret: string, message: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
};

const quotePlus = (value: string): string =>
  encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");

const compare = (left: string, right: string): number => {
  if (left < right) return -1;
  return left > right ? 1 : 0;
};

export const signedTarget = (path: string, query: ReadonlyArray<[string, string]>): string => {
  if (query.length === 0) return path;
  const sorted = [...query].sort(
    (left, right) => compare(left[0], right[0]) || compare(left[1], right[1]),
  );
  return `${path}?${sorted.map(([key, value]) => `${quotePlus(key)}=${quotePlus(value)}`).join("&")}`;
};

export const signRequest = async (input: {
  secret: string;
  timestamp: string;
  method: string;
  target: string;
  body: string;
}): Promise<string> => {
  const digest = await sha256Hex(input.body);
  return hmacSha256Hex(
    input.secret,
    `${input.timestamp}.${input.method.toUpperCase()}.${input.target}.${digest}`,
  );
};

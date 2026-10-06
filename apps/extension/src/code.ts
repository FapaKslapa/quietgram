export const normalizeCode = (raw: string): string =>
  raw.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "").replace(/\s+/g, "");

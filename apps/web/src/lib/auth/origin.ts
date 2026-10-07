const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const isTrustedRequestOrigin = (request: Request, baseUrl: string): boolean => {
  if (SAFE_METHODS.has(request.method)) return true;
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(baseUrl).origin;
};

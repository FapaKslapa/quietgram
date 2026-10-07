export type ErrorLogEntry = {
  path: string | undefined;
  code: string;
  message: string;
  cause: string | undefined;
};

export const logError = (entry: ErrorLogEntry): void => {
  process.stderr.write(`${JSON.stringify({ level: "error", ...entry })}\n`);
};

const REDACTED_PREFIXES = ["credentials."];

export const loggableMessage = (path: string | undefined, message: string): string =>
  path !== undefined && REDACTED_PREFIXES.some((prefix) => path.startsWith(prefix))
    ? "redacted"
    : message;

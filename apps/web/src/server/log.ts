export type ErrorLogEntry = {
  path: string | undefined;
  code: string;
  message: string;
  cause: string | undefined;
};

export const logError = (entry: ErrorLogEntry): void => {
  process.stderr.write(`${JSON.stringify({ level: "error", ...entry })}\n`);
};

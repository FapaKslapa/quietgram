const RUN_KEY = "nodistraction:refresh-run";
const INTERRUPTED_KEY = "nodistraction:refresh-interrupted";

const read = (key: string): string | null => {
  try {
    return globalThis.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null): void => {
  try {
    if (value === null) globalThis.sessionStorage.removeItem(key);
    else globalThis.sessionStorage.setItem(key, value);
  } catch {
    return;
  }
};

export const rememberRun = (runId: string): void => write(RUN_KEY, runId);

export const recallRun = (): string | null => read(RUN_KEY);

export const forgetRun = (): void => write(RUN_KEY, null);

export const markInterrupted = (): void => write(INTERRUPTED_KEY, "1");

export const takeInterrupted = (): boolean => {
  const interrupted = read(INTERRUPTED_KEY) !== null;
  if (interrupted) write(INTERRUPTED_KEY, null);
  return interrupted;
};

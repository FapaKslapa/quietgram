export class CooldownError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Refresh is cooling down");
    this.name = "CooldownError";
  }
}

export class NoSessionError extends Error {
  constructor() {
    super("No Instagram session is paired");
    this.name = "NoSessionError";
  }
}

export class RunNotFoundError extends Error {
  constructor() {
    super("Refresh run not found");
    this.name = "RunNotFoundError";
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Instagram session expired");
    this.name = "SessionExpiredError";
  }
}

export class IgHttpError extends Error {
  constructor(readonly status: number) {
    super(`Instagram responded ${status}`);
    this.name = "IgHttpError";
  }
}

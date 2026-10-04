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

export class IgRejectedError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | null,
    readonly spam: boolean,
  ) {
    super(reason ?? `Instagram rejected the request with ${status}`);
    this.name = "IgRejectedError";
  }
}

export class IgThrottledError extends Error {
  constructor() {
    super("Instagram asked to wait a few minutes");
    this.name = "IgThrottledError";
  }
}

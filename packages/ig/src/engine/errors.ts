export class EngineSendDisabledError extends Error {
  constructor() {
    super("Engine has message sending disabled");
    this.name = "EngineSendDisabledError";
  }
}

export class EngineInteractionsDisabledError extends Error {
  constructor() {
    super("Engine has interactions disabled");
    this.name = "EngineInteractionsDisabledError";
  }
}

export class EngineUnreachableError extends Error {
  readonly reason: string;

  constructor(cause: unknown) {
    super("Engine is unreachable", { cause });
    this.name = "EngineUnreachableError";
    this.reason = cause instanceof Error ? cause.name : "unknown";
  }
}

export class EngineResponseError extends Error {
  constructor(readonly reason: string) {
    super(`Engine response did not match: ${reason}`);
    this.name = "EngineResponseError";
  }
}

export class EngineSendDisabledError extends Error {
  constructor() {
    super("Engine has message sending disabled");
    this.name = "EngineSendDisabledError";
  }
}

export class EngineUnreachableError extends Error {
  constructor(cause: unknown) {
    super("Engine is unreachable", { cause });
    this.name = "EngineUnreachableError";
  }
}

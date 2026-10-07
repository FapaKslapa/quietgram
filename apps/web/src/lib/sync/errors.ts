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

export class MessageSendError extends Error {
  constructor(cause: unknown) {
    super("Message could not be sent", { cause });
    this.name = "MessageSendError";
  }
}

export class InteractionsDisabledError extends Error {
  constructor() {
    super("Interactions are disabled for this account");
    this.name = "InteractionsDisabledError";
  }
}

export class LoginAttentionError extends Error {
  constructor(readonly kind: "challenge" | "credentials") {
    super(
      kind === "challenge"
        ? "Instagram asked for a verification during automatic login"
        : "Instagram rejected the stored credentials",
    );
    this.name = "LoginAttentionError";
  }
}

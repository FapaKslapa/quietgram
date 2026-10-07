import { describe, expect, it } from "vitest";
import {
  LOGIN_FALLBACK,
  LOGIN_THROTTLED,
  LOGIN_WAIT,
  loginErrorMessage,
} from "@/lib/credentials/login-error";

const failure = (code: string, reason: string, message = "x") => ({
  message,
  data: { code, failure: { reason } },
});

describe("loginErrorMessage", () => {
  it("shows the server message for credential problems", () => {
    expect(
      loginErrorMessage(failure("PRECONDITION_FAILED", "login_bad_password", "Password")),
    ).toBe("Password");
    expect(loginErrorMessage(failure("PRECONDITION_FAILED", "login_challenge", "Verifica"))).toBe(
      "Verifica",
    );
  });

  it("explains the double submit guard and Instagram throttles", () => {
    expect(loginErrorMessage(failure("TOO_MANY_REQUESTS", "cooldown"))).toBe(LOGIN_WAIT);
    expect(loginErrorMessage(failure("TOO_MANY_REQUESTS", "throttled"))).toBe(LOGIN_THROTTLED);
  });

  it("never leaks unknown server text", () => {
    expect(loginErrorMessage(failure("BAD_GATEWAY", "instagram_error", "secret detail"))).toBe(
      LOGIN_FALLBACK,
    );
    expect(loginErrorMessage(new TypeError("Failed to fetch"))).toBe(LOGIN_FALLBACK);
  });
});

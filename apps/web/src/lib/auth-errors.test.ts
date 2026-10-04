import { describe, expect, it } from "vitest";
import { canRegister, describeAuthError } from "@/lib/auth-errors";

describe("describeAuthError", () => {
  it("treats a dismissed prompt as a cancellation", () => {
    expect(describeAuthError({ code: "AUTH_CANCELLED" }, "login")).toContain("annullata");
    expect(describeAuthError({ code: "AUTH_CANCELLED" }, "register")).toContain("annullata");
  });

  it("explains a denied registration", () => {
    expect(describeAuthError({ code: "BOOTSTRAP_DENIED", status: 403 }, "register")).toContain(
      "codice di registrazione",
    );
    expect(describeAuthError({ status: 403 }, "register")).toContain("codice di registrazione");
  });

  it("points a first-time visitor to Primo accesso when no passkey matches", () => {
    expect(describeAuthError({ status: 401 }, "login")).toContain("Primo accesso");
  });

  it("asks to wait on rate limits", () => {
    expect(describeAuthError({ status: 429 }, "login")).toContain("Aspetta");
    expect(describeAuthError({ status: 429 }, "register")).toContain("Aspetta");
  });

  it("falls back per action", () => {
    expect(describeAuthError(null, "login")).toBe("Accesso non riuscito. Riprova.");
    expect(describeAuthError(null, "register")).toContain("passkey");
  });
});

describe("canRegister", () => {
  it("needs a plausible email and a secret", () => {
    expect(canRegister("a@b.it", "segreto")).toBe(true);
    expect(canRegister(" a@b.it ", " x ")).toBe(true);
    expect(canRegister("a@b", "segreto")).toBe(false);
    expect(canRegister("a@b.it", "  ")).toBe(false);
    expect(canRegister("", "x")).toBe(false);
  });
});

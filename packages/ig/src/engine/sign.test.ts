import { describe, expect, it } from "vitest";
import { signedTarget, signRequest } from "#ig/engine/sign";

const SECRET = "test-secret-0123456789";
const TIMESTAMP = "1700000000";

describe("signedTarget", () => {
  it("returns the bare path without a query", () => {
    expect(signedTarget("/v1/session", [])).toBe("/v1/session");
  });

  it("sorts by key then value and encodes like python urlencode", () => {
    expect(
      signedTarget("/v1/timeline", [
        ["cursor", "a/b c*~'!()"],
        ["amount", "1"],
      ]),
    ).toBe("/v1/timeline?amount=1&cursor=a%2Fb+c%2A~%27%21%28%29");
    expect(
      signedTarget("/x", [
        ["a", "2"],
        ["a", "1"],
      ]),
    ).toBe("/x?a=1&a=2");
  });
});

describe("signRequest", () => {
  it("matches the vector pinned in the python tests for a get with query", async () => {
    const target = signedTarget("/v1/timeline", [
      ["cursor", "a/b c*~'!()"],
      ["amount", "1"],
    ]);
    expect(
      await signRequest({ secret: SECRET, timestamp: TIMESTAMP, method: "GET", target, body: "" }),
    ).toBe("fad3f217ea857f6d6852414044c30cb504eb7f654782ad7732b1bc39c52ddb2c");
  });

  it("matches the vector pinned in the python tests for a post with body", async () => {
    expect(
      await signRequest({
        secret: SECRET,
        timestamp: TIMESTAMP,
        method: "post",
        target: "/v1/threads/42/messages",
        body: '{"text":"ciao"}',
      }),
    ).toBe("04b56bf05c8c699fa1ddd5eff8d755f2f2a5f1795884056dca2643fa76a315a0");
  });
});

import { describe, expect, it } from "vitest";
import { clientWith, json, SECRET } from "#ig/engine/client-harness";
import { EngineBadCredentialsError, EngineLoginChallengeError } from "#ig/engine/errors";
import { signRequest } from "#ig/engine/sign";
import { IgThrottledError } from "#ig/errors";

const result = { sessionid: "1000%3Aabc%3A28", csrftoken: "csrf", user_id: 1000, username: "me" };

describe("engine credentials login", () => {
  it("posts the signed credentials and maps the fresh session", async () => {
    const { client, seen } = clientWith(() => json(result));
    expect(
      await client.loginWithCredentials({ username: "me", password: "pw", totpSecret: "ABC" }),
    ).toEqual({ sessionId: "1000%3Aabc%3A28", csrfToken: "csrf", userId: "1000", username: "me" });
    const [request] = seen;
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://engine.test/v1/session/login");
    expect(request?.body).toBe('{"username":"me","password":"pw","totp_secret":"ABC"}');
    expect(request?.headers.get("x-engine-signature")).toBe(
      await signRequest({
        secret: SECRET,
        timestamp: "1700000000",
        method: "POST",
        target: "/v1/session/login",
        body: request?.body ?? "",
      }),
    );
  });

  it("leaves the totp secret out when there is none", async () => {
    const { client, seen } = clientWith(() => json(result));
    await client.loginWithCredentials({ username: "me", password: "pw" });
    expect(seen[0]?.body).toBe('{"username":"me","password":"pw"}');
  });

  it("maps challenge, rejected credentials and throttling", async () => {
    const login = (status: number, body: unknown) =>
      clientWith(() => json(body, status)).client.loginWithCredentials({
        username: "me",
        password: "pw",
      });
    await expect(login(403, { code: "challenge_required" })).rejects.toThrow(
      EngineLoginChallengeError,
    );
    await expect(login(403, { code: "bad_credentials" })).rejects.toThrow(
      EngineBadCredentialsError,
    );
    await expect(login(429, { code: "throttled" })).rejects.toThrow(IgThrottledError);
  });

  it("rejects a response without a session id", async () => {
    const { client } = clientWith(() => json({ ...result, sessionid: "" }));
    await expect(
      client.loginWithCredentials({ username: "me", password: "pw" }),
    ).rejects.toMatchObject({
      name: "EngineResponseError",
      reason: "sessionid",
    });
  });
});

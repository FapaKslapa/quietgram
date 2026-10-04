import { describe, expect, it } from "vitest";
import { IgHttpError, IgRejectedError, IgThrottledError, SessionExpiredError } from "#ig/errors";
import { createRequester } from "#ig/request";

const cookies = { sessionId: "s", csrfToken: "c", userId: "1" };
const fakeFetch =
  (body: string, status = 200): typeof fetch =>
  async () =>
    new Response(body, { status });

describe("requester", () => {
  it("returns parsed json", async () => {
    const r = createRequester(cookies, fakeFetch('{"a":1}'));
    expect(await r.get("/x")).toEqual({ a: 1 });
  });

  it("treats html as expired session", async () => {
    const r = createRequester(cookies, fakeFetch("<!DOCTYPE html><html>"));
    await expect(r.get("/x")).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it("treats checkpoint_required as expired session", async () => {
    const r = createRequester(cookies, fakeFetch('{"message":"checkpoint_required"}', 400));
    await expect(r.get("/x")).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it("treats login_required as expired session", async () => {
    const r = createRequester(cookies, fakeFetch('{"message":"login_required"}', 200));
    await expect(r.get("/x")).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it("treats 401 as expired session", async () => {
    const r = createRequester(cookies, fakeFetch("{}", 401));
    await expect(r.get("/x")).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it("does not mistake content mentioning login_required for an expired session", async () => {
    const r = createRequester(cookies, fakeFetch('{"caption":"login_required"}'));
    expect(await r.get("/x")).toEqual({ caption: "login_required" });
  });

  it("raises an http error for other failures", async () => {
    const r = createRequester(cookies, fakeFetch('{"message":"boom"}', 500));
    await expect(r.get("/x")).rejects.toMatchObject({ status: 500 });
    await expect(r.get("/x")).rejects.toBeInstanceOf(IgHttpError);
  });

  it("raises an http error for a non-json failure body", async () => {
    const r = createRequester(cookies, fakeFetch("oops", 502));
    await expect(r.get("/x")).rejects.toBeInstanceOf(IgHttpError);
  });

  it("sends session cookies and query params", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const recording: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response("{}");
    };
    await createRequester(cookies, recording).get("/x", { count: "5" });
    const [call] = calls;
    expect(call?.url).toBe("https://www.instagram.com/x?count=5");
    expect(new Headers(call?.init?.headers).get("cookie")).toBe(
      "sessionid=s; csrftoken=c; ds_user_id=1",
    );
  });

  it("posts form bodies", async () => {
    const calls: { init: RequestInit | undefined }[] = [];
    const recording: typeof fetch = async (_input, init) => {
      calls.push({ init });
      return new Response("{}");
    };
    await createRequester(cookies, recording).postForm("/x", { a: "1" });
    const init = calls[0]?.init;
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toBe("a=1");
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/x-www-form-urlencoded",
    );
  });
});

describe("requester classification", () => {
  it("does not treat require_login alone as expired session", async () => {
    const r = createRequester(cookies, fakeFetch('{"require_login":true}', 400));
    await expect(r.get("/x")).rejects.toBeInstanceOf(IgRejectedError);
  });

  it("treats a wait-a-few-minutes 401 with require_login as a throttle", async () => {
    const r = createRequester(
      cookies,
      fakeFetch(
        '{"message":"Please wait a few minutes before you try again.","status":"fail","require_login":true}',
        401,
      ),
    );
    await expect(r.get("/x")).rejects.toBeInstanceOf(IgThrottledError);
  });

  it("treats a 429 as a throttle", async () => {
    const r = createRequester(cookies, fakeFetch("{}", 429));
    await expect(r.get("/x")).rejects.toBeInstanceOf(IgThrottledError);
  });

  it("treats a wait-a-few-minutes 403 write as a throttle", async () => {
    const r = createRequester(cookies, fakeFetch('{"message":"Please wait a few minutes"}', 403));
    await expect(r.postForm("/x", { a: "1" })).rejects.toBeInstanceOf(IgThrottledError);
  });

  it("treats a 403 json feedback_required write as a rejection", async () => {
    const r = createRequester(
      cookies,
      fakeFetch('{"message":"feedback_required","spam":true,"status":"fail"}', 403),
    );
    const error = await r.postForm("/x", { a: "1" }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(IgRejectedError);
    expect(error).toMatchObject({ status: 403, message: "feedback_required", spam: true });
  });

  it("treats a 403 json without message as a rejection with no reason", async () => {
    const r = createRequester(cookies, fakeFetch('{"status":"fail"}', 403));
    const error = await r.postForm("/x", { a: "1" }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(IgRejectedError);
    expect(error).toMatchObject({ status: 403, spam: false, reason: null });
  });

  it("treats a 400 json read as a rejection", async () => {
    const r = createRequester(cookies, fakeFetch('{"message":"nope"}', 400));
    await expect(r.get("/x")).rejects.toBeInstanceOf(IgRejectedError);
  });

  it("treats an html 403 on a post as a rejection", async () => {
    const r = createRequester(cookies, fakeFetch("<html>blocked</html>", 403));
    await expect(r.postForm("/x", { a: "1" })).rejects.toBeInstanceOf(IgRejectedError);
  });

  it("treats an html 403 on a read as expired session", async () => {
    const r = createRequester(cookies, fakeFetch("<html>login</html>", 403));
    await expect(r.get("/x")).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it("treats a login_required write as expired session even on 403", async () => {
    const r = createRequester(cookies, fakeFetch('{"message":"login_required"}', 403));
    await expect(r.postForm("/x", { a: "1" })).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it("never exposes the raw body on a rejection", async () => {
    const r = createRequester(cookies, fakeFetch('{"message":"m","secret":"zzz"}', 403));
    const error = await r.postForm("/x", { a: "1" }).catch((cause: unknown) => cause);
    expect(JSON.stringify(error)).not.toContain("zzz");
  });
});

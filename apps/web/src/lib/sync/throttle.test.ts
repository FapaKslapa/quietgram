import { describe, expect, it } from "vitest";
import { throttle } from "@/lib/sync/throttle";
import { fakeRequester } from "@/test/helpers";

describe("throttle", () => {
  it("waits between requests but not before the first", async () => {
    const events: string[] = [];
    const { requester } = fakeRequester(({ path }) => {
      events.push(`request ${path}`);
      return {};
    });
    const slow = throttle(requester, async () => {
      events.push("delay");
    });
    await slow.get("/a");
    await slow.get("/b");
    await slow.postForm("/c", {});
    expect(events).toEqual(["request /a", "delay", "request /b", "delay", "request /c"]);
  });
});

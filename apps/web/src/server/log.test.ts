import { describe, expect, it } from "vitest";
import { loggableMessage } from "@/server/log";

describe("loggableMessage", () => {
  it("hides messages from credential procedures", () => {
    expect(loggableMessage("credentials.save", "password: hunter2")).toBe("redacted");
  });

  it("keeps other messages", () => {
    expect(loggableMessage("feed.list", "boom")).toBe("boom");
    expect(loggableMessage(undefined, "boom")).toBe("boom");
  });
});

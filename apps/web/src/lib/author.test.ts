import { describe, expect, it } from "vitest";
import { AVATAR_COLORS, avatarColor, initialsOf } from "@/lib/author";

describe("initialsOf", () => {
  it("uses the first letters of two name parts", () => {
    expect(initialsOf("giulia.r")).toBe("GR");
    expect(initialsOf("ristorante.da.nino")).toBe("RD");
    expect(initialsOf("marco_b")).toBe("MB");
  });

  it("uses two letters of a single word", () => {
    expect(initialsOf("panificio")).toBe("PA");
    expect(initialsOf("x")).toBe("X");
  });

  it("returns an empty string for an empty name", () => {
    expect(initialsOf("")).toBe("");
    expect(initialsOf("..")).toBe("");
  });
});

describe("avatarColor", () => {
  it("is stable and drawn from the palette", () => {
    expect(avatarColor("42")).toBe(avatarColor("42"));
    expect(AVATAR_COLORS).toContain(avatarColor("42") as (typeof AVATAR_COLORS)[number]);
  });
});

import { describe, expect, it } from "vitest";
import { collapseCaption } from "@/lib/caption";

describe("collapseCaption", () => {
  it("keeps a short caption whole", () => {
    expect(collapseCaption("Sentiero del sabato.")).toEqual({
      text: "Sentiero del sabato.",
      collapsed: false,
    });
  });

  it("cuts a long caption at a word boundary", () => {
    const caption = "parola ".repeat(40).trim();
    const view = collapseCaption(caption);
    expect(view.collapsed).toBe(true);
    expect(view.text.length).toBeLessThanOrEqual(110);
    expect(view.text.endsWith("parola")).toBe(true);
    expect(caption.startsWith(view.text)).toBe(true);
  });

  it("collapses after three lines", () => {
    const view = collapseCaption("a\nb\nc\nd\ne");
    expect(view).toEqual({ text: "a\nb\nc", collapsed: true });
  });

  it("keeps exactly three lines whole", () => {
    expect(collapseCaption("a\nb\nc")).toEqual({ text: "a\nb\nc", collapsed: false });
  });

  it("hard cuts a single very long word", () => {
    const view = collapseCaption("x".repeat(300));
    expect(view.collapsed).toBe(true);
    expect(view.text).toHaveLength(110);
  });

  it("handles an empty caption", () => {
    expect(collapseCaption("")).toEqual({ text: "", collapsed: false });
  });
});

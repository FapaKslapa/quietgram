import { describe, expect, it } from "vitest";
import { formatClock, formatRelativeTime, formatStampDay, formatStampYear } from "@/lib/time";

const at = (iso: string) => new Date(iso).getTime();
const NOW = at("2026-10-04T10:00:00Z");

describe("formatClock", () => {
  it("renders Rome time with two digits", () => {
    expect(formatClock(at("2026-10-04T07:41:00Z"))).toBe("09:41");
    expect(formatClock(at("2026-01-04T23:05:00Z"))).toBe("00:05");
  });
});

describe("formatRelativeTime", () => {
  it("says adesso inside the first minute", () => {
    expect(formatRelativeTime(NOW - 20_000, NOW)).toBe("adesso");
  });

  it("uses oggi and ieri with the clock", () => {
    expect(formatRelativeTime(at("2026-10-04T06:12:00Z"), NOW)).toBe("oggi 08:12");
    expect(formatRelativeTime(at("2026-10-03T19:30:00Z"), NOW)).toBe("ieri 21:30");
  });

  it("switches day at Rome midnight, not UTC midnight", () => {
    const justAfterMidnight = at("2026-10-03T22:30:00Z");
    expect(formatRelativeTime(justAfterMidnight, at("2026-10-04T08:00:00Z"))).toBe("oggi 00:30");
  });

  it("uses the weekday inside the last week", () => {
    expect(formatRelativeTime(at("2026-10-01T10:00:00Z"), NOW)).toBe("gio 12:00");
  });

  it("uses a date after a week and adds the year when it differs", () => {
    expect(formatRelativeTime(at("2026-09-20T10:00:00Z"), NOW)).toBe("20 set");
    expect(formatRelativeTime(at("2025-12-24T10:00:00Z"), NOW)).toBe("24 dic 2025");
  });

  it("treats a future timestamp as today", () => {
    expect(formatRelativeTime(NOW + 3_600_000, NOW)).toBe("oggi 13:00");
  });
});

describe("postmark date", () => {
  it("formats day, month and year", () => {
    expect(formatStampDay(NOW)).toBe("04 OTT");
    expect(formatStampYear(NOW)).toBe("2026");
  });
});

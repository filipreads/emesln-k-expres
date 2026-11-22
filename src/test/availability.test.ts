import { describe, expect, it } from "vitest";
import { availableCount } from "@/lib/availability";

describe("Availability expires after 12 hours", () => {
  const updated = Date.parse("2026-11-20T10:00:00Z");
  const row = { available_count: 5, updated_at: "2026-11-20T10:00:00Z" };
  it("keeps five available tradespeople just before 12 hours", () => {
    expect(availableCount(row, updated + 12 * 60 * 60 * 1000 - 1)).toBe(5);
  });
  it("hides five available tradespeople at 12 hours and on Monday", () => {
    expect(availableCount(row, updated + 12 * 60 * 60 * 1000)).toBe(0);
    expect(availableCount(row, Date.parse("2026-11-23T10:00:00Z"))).toBe(0);
  });
  it("treats invalid or future timestamps as unknown availability", () => {
    expect(availableCount({ ...row, updated_at: "invalid" }, updated)).toBe(0);
    expect(availableCount(row, updated - 1)).toBe(0);
  });
});
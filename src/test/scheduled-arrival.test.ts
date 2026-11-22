import { describe, expect, it } from "vitest";
import { shouldShowArrivalCountdown } from "@/lib/content";

describe("Scheduled acceptance is not an immediate arrival promise", () => {
  it("does not start a 60-minute countdown for a planned visit", () => {
    expect(shouldShowArrivalCountdown({ urgency: "planovano", status: "prijato", arrival_minutes: 60 })).toBe(false);
  });
  it("keeps the 60-minute countdown for accepted emergency and same-day jobs", () => {
    expect(shouldShowArrivalCountdown({ urgency: "havarie", status: "prijato", arrival_minutes: 60 })).toBe(true);
    expect(shouldShowArrivalCountdown({ urgency: "dnes", status: "prijato", arrival_minutes: 60 })).toBe(true);
  });
  it("does not predict arrival without a positive estimate or for a completed job", () => {
    expect(shouldShowArrivalCountdown({ urgency: "dnes", status: "prijato", arrival_minutes: null })).toBe(false);
    expect(shouldShowArrivalCountdown({ urgency: "dnes", status: "prijato", arrival_minutes: 0 })).toBe(false);
    expect(shouldShowArrivalCountdown({ urgency: "dnes", status: "dokonceno", arrival_minutes: 60 })).toBe(false);
  });
});
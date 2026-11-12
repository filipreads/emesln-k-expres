import { describe, expect, it } from "vitest";
import { REGIONS, canOffer, canProgress } from "@/lib/regions";

describe("Nationwide dispatch", () => {
  it("covers all 14 Czech regions including Moravia", () => {
    expect(REGIONS).toHaveLength(14);
    expect(REGIONS).toContain("Moravskoslezský kraj");
    expect(REGIONS).toContain("Jihomoravský kraj");
  });
  const request = { trade: "voda", region: "Jihomoravský kraj" };
  const craftsman = { ...request, approved: true, available: true };
  it("offers a job only in the matching region", () => {
    expect(canOffer(request, craftsman)).toBe(true);
    expect(canOffer(request, { ...craftsman, region: "Praha" })).toBe(false);
    expect(canOffer({ ...request, region: null }, { ...craftsman, region: null })).toBe(false);
  });
  it("offers only the correct trade", () => { expect(canOffer(request, { ...craftsman, trade: "elektro" })).toBe(false); });
  it("does not offer to unapproved craftspeople", () => { expect(canOffer(request, { ...craftsman, approved: false })).toBe(false); });
  it("does not offer to unavailable craftspeople", () => { expect(canOffer(request, { ...craftsman, available: false })).toBe(false); });
  it("allows accepted to on-the-way, then completed without skipping", () => {
    expect(canProgress("prijato", "na_ceste")).toBe(true);
    expect(canProgress("na_ceste", "dokonceno")).toBe(true);
    expect(canProgress("nova", "dokonceno")).toBe(false);
    expect(canProgress("prijato", "dokonceno")).toBe(false);
    expect(canProgress("dokonceno", "na_ceste")).toBe(false);
  });
});
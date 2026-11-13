import { describe, it, expect } from "vitest";
import { computeGame } from "@/lib/gamification";

const j = (status: string, day: number, arrival: number | null = null) => ({ status, created_at: new Date(2026, 0, day).toISOString(), arrival_minutes: arrival });

describe("gamification", () => {
  it("customer earns first order badge after one order", () => {
    const g = computeGame([j("nova", 1)], "customer");
    expect(g.achievements.find((a) => a.id === "first_order")?.earned).toBe(true);
    expect(g.achievements.find((a) => a.id === "first_done")?.earned).toBe(false);
  });
  it("completed fast job gives 100 + 50 points to craftsman", () => {
    expect(computeGame([j("dokonceno", 1, 40)], "craftsman").points).toBe(150);
  });
  it("arrival over 45 minutes is not fast", () => {
    expect(computeGame([j("dokonceno", 1, 46)], "craftsman").achievements.find((a) => a.id === "fast")?.earned).toBe(false);
  });
  it("streak needs 3 orders within 30 days", () => {
    expect(computeGame([j("nova", 1), j("nova", 10), j("nova", 25)], "customer").achievements.find((a) => a.id === "streak")?.earned).toBe(true);
    expect(computeGame([j("nova", 1), j("nova", 20), j("nova", 40)], "customer").achievements.find((a) => a.id === "streak")?.earned).toBe(false);
  });
});

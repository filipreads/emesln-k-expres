import { describe, expect, it } from "vitest";
import { emailSchema, canCancelOrder, canSetAvailable, canChangeStatus, DISPATCH_EMAIL } from "@/lib/communication";

describe("Email-only communication", () => {
  it("accepts email and rejects a phone number", () => {
    expect(emailSchema.parse("  Customer@Example.com ")).toBe("customer@example.com");
    expect(emailSchema.safeParse("+420 777 123 456").success).toBe(false);
  });
  it("uses the dispatch recipient provided by the operator", () => {
    expect(DISPATCH_EMAIL).toBe("Dirtparkborsov@gmail.com");
  });
});
describe("Order cancellation", () => {
  it("allows unassigned new or offered jobs", () => {
    expect(canCancelOrder({ status: "nova", assigned_craftsman_id: null, cancelled_at: null })).toBe(true);
    expect(canCancelOrder({ status: "oslovovani", assigned_craftsman_id: null, cancelled_at: null })).toBe(true);
  });
  it("refuses cancellation after acceptance or cancellation", () => {
    expect(canCancelOrder({ status: "prijato", assigned_craftsman_id: "craft", cancelled_at: null })).toBe(false);
    expect(canCancelOrder({ status: "nova", assigned_craftsman_id: "craft", cancelled_at: null })).toBe(false);
    expect(canCancelOrder({ status: "nova", assigned_craftsman_id: null, cancelled_at: "2026-11-23" })).toBe(false);
  });
});
describe("Craftsman availability", () => {
  it("does not permit availability with an active job", () => {
    expect(canSetAvailable(0)).toBe(true);
    expect(canSetAvailable(1)).toBe(false);
  });
});
describe("Dispatcher status transitions", () => {
  it("prevents skipping acceptance and reversing completed work", () => {
    expect(canChangeStatus("nova", "prijato")).toBe(false);
    expect(canChangeStatus("prijato", "na_ceste")).toBe(true);
    expect(canChangeStatus("na_ceste", "dokonceno")).toBe(true);
    expect(canChangeStatus("dokonceno", "nova")).toBe(false);
  });
});

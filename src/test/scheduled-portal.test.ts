import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: () => ({ handler: (fn: unknown) => fn }),
    handler: (fn: unknown) => fn,
  }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => ({ select: (columns: string) => {
      mocks.select(table, columns);
      const builder = {
        eq: () => builder, in: () => builder, order: () => builder,
        single: async () => ({ data: { id: "craftsman", approved: true }, error: null }),
        limit: async () => ({ data: [], error: null }),
      };
      return builder;
    } }),
  },
}));
import { craftsmanPortal } from "@/lib/workflow.functions";

describe("Scheduled visit survives the craftsman portal projection", () => {
  it("includes preferred_time in both offers and accepted jobs", async () => {
    const run = craftsmanPortal as unknown as (input: { data: { token: string } }) => Promise<unknown>;
    await run({ data: { token: "00000000-0000-4000-8000-000000000001" } });
    const offerColumns = mocks.select.mock.calls.find(([table]) => table === "job_offers")?.[1];
    const jobColumns = mocks.select.mock.calls.find(([table]) => table === "service_requests")?.[1];
    expect(offerColumns?.split(/[(),]/)).toContain("preferred_time");
    expect(jobColumns?.split(",")).toEqual(expect.arrayContaining(["urgency", "preferred_time"]));
  });
});
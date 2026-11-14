import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orderRows: [{ id: "own-order", address: "Masarykova 1", description: "Teče voda pod dřezem", status: "na_ceste" }],
  select: vi.fn(),
  eq: vi.fn(),
  error: null as { message: string } | null,
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ middleware: () => ({ handler: (fn: unknown) => fn }) }),
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: (columns: string) => {
        mocks.select(table, columns);
        return { eq: (column: string, value: string) => {
          mocks.eq(table, column, value);
          return {
            order: () => ({ limit: async () => ({ data: mocks.orderRows, error: mocks.error }) }),
            limit: async () => ({ data: [] }),
          };
        } };
      },
    }),
  },
}));

import { getMyAccount } from "@/lib/account.functions";

const runAccount = getMyAccount as unknown as (input: {
  context: { userId: string; supabase: { from: () => unknown } };
}) => Promise<{ orders: typeof mocks.orderRows }>;
const context = {
  userId: "signed-in-customer",
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) },
};

describe("Customer order overview", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.error = null; });

  it("reads only the authenticated customer's orders", async () => {
    await runAccount({ context });
    expect(mocks.eq).toHaveBeenCalledWith("service_requests", "customer_user_id", "signed-in-customer");
  });

  it("returns saved status, address and job details", async () => {
    const result = await runAccount({ context });
    const projection = mocks.select.mock.calls.find(([table]) => table === "service_requests")?.[1].split(",");
    expect(projection).toEqual(expect.arrayContaining(["status", "address", "description", "urgency", "postal_code", "phone"]));
    expect(result.orders[0]).toEqual({ id: "own-order", address: "Masarykova 1", description: "Teče voda pod dřezem", status: "na_ceste" });
  });

  it("does not disguise a failed read as an empty order list", async () => {
    mocks.error = { message: "Unavailable" };
    await expect(runAccount({ context })).rejects.toThrow("Objednávky se nepodařilo načíst");
  });
});
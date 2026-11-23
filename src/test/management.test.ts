import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn(), eq: vi.fn(), craft: { id: "approved-craftsman" } as { id: string } | null }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: mock.rpc,
  from: () => ({ select: () => {
    const query = { eq: (key: string, value: unknown) => { mock.eq(key, value); return query; }, single: async () => ({ data: mock.craft }) };
    return query;
  } }),
} }));
import { cancelMyOrder, setMyAvailability, manageRequest } from "@/lib/management.functions";
const cancel = cancelMyOrder as unknown as (arg: { data: { id: string }; context: { userId: string } }) => Promise<unknown>;
const available = setMyAvailability as unknown as (arg: { data: { token: string; available: boolean } }) => Promise<unknown>;
const manage = manageRequest as unknown as (arg: { data: { pin: string; id: string; cancel: boolean } }) => Promise<unknown>;

describe("Protected management actions", () => {
  beforeEach(() => { vi.clearAllMocks(); mock.rpc.mockResolvedValue({ error: null }); mock.craft = { id: "approved-craftsman" }; });
  it("resolves cancellation ownership from the authenticated account, not browser input", async () => {
    await cancel({ data: { id: "order" }, context: { userId: "signed-in-owner" } });
    expect(mock.rpc).toHaveBeenCalledWith("change_request", { p_id: "order", p_actor: "zakaznik", p_cancel: true, p_customer: "signed-in-owner" });
  });
  it("does not report success when atomic cancellation is refused", async () => {
    mock.rpc.mockResolvedValue({ error: { message: "Already accepted" } });
    await expect(cancel({ data: { id: "order" }, context: { userId: "owner" } })).rejects.toThrow("před přijetím");
  });
  it("validates the portal token and approval before changing availability", async () => {
    await available({ data: { token: "portal-token", available: true } });
    expect(mock.eq).toHaveBeenCalledWith("portal_token", "portal-token");
    expect(mock.eq).toHaveBeenCalledWith("approved", true);
    expect(mock.rpc).toHaveBeenCalledWith("set_craftsman_state", { p_id: "approved-craftsman", p_approved: true, p_available: true });
  });
  it("denies an invalid portal token without mutating data", async () => {
    mock.craft = null;
    await expect(available({ data: { token: "invalid", available: true } })).rejects.toThrow("Neplatný přístup");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("denies a dispatcher action with an invalid PIN", async () => {
    await expect(manage({ data: { pin: "", id: "order", cancel: true } })).rejects.toThrow("Neplatný PIN");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeGame } from "./gamification";

export const getMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("display_name").eq("id", context.userId).maybeSingle();
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: orders, error: ordersError } = await db.from("service_requests").select("id,trade,status,urgency,address,district,city,postal_code,region,description,phone,created_at,updated_at,arrival_minutes,tracking_token").eq("customer_user_id", context.userId).order("created_at", { ascending: false }).limit(100);
    if (ordersError) throw new Error("Objednávky se nepodařilo načíst. Zkuste to prosím znovu.");
    const { data: crafts } = await db.from("craftsman_applications").select("id,name,trade,approved,portal_token").eq("user_id", context.userId).limit(5);
    const craft = crafts?.[0] ?? null;
    let jobs: { status: string; created_at: string; updated_at: string; arrival_minutes: number | null }[] = [];
    if (craft) {
      const { data } = await db.from("service_requests").select("status,created_at,updated_at,arrival_minutes").eq("assigned_craftsman_id", craft.id).limit(500);
      jobs = data ?? [];
    }
    return {
      name: profile?.display_name ?? null,
      orders: orders ?? [],
      customerGame: computeGame(orders ?? [], "customer"),
      craftsman: craft ? { name: craft.name, trade: craft.trade, approved: craft.approved, portal_token: craft.approved ? craft.portal_token : null, game: computeGame(jobs, "craftsman") } : null,
    };
  });

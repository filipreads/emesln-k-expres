import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REGIONS } from "./regions";

const dispatcher = z.object({ pin: z.string().max(200), id: z.string().uuid() });
export const manageRequest = createServerFn({ method: "POST" })
  .inputValidator(dispatcher.extend({ note: z.string().trim().max(2000).optional(), cancel: z.boolean().optional(), craftsman: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    if (!process.env["DISPATCH_PIN"] || data.pin !== process.env["DISPATCH_PIN"]) throw new Error("Neplatný PIN");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const result = data.craftsman
      ? await db.rpc("assign_request", { p_request: data.id, p_craftsman: data.craftsman })
      : await db.rpc("change_request", { p_id: data.id, p_actor: "dispecink", p_cancel: data.cancel ?? false, ...(data.note !== undefined ? { p_note: data.note } : {}) });
    if (result.error) throw new Error("Změna není možná. Obnovte přehled a zkontrolujte stav a dostupnost mistra.");
    return { ok: true };
  });

export const cancelMyOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db.rpc("change_request", { p_id: data.id, p_actor: "zakaznik", p_cancel: true, p_customer: context.userId });
    if (error) throw new Error("Zrušit lze pouze vlastní objednávku před přijetím mistrem.");
    return { ok: true };
  });

export const saveMyProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string().trim().max(100), address: z.string().trim().max(200), city: z.string().trim().max(100), postal_code: z.string().trim().regex(/^(\d{3}\s?\d{2})?$/), region: z.enum(REGIONS) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db.from("customer_profiles").upsert({ ...data, user_id: context.userId, updated_at: new Date().toISOString() });
    if (error) throw new Error("Profil se nepodařilo uložit.");
    return { ok: true };
  });

export const setMyAvailability = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().uuid(), available: z.boolean() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: c } = await db.from("craftsman_applications").select("id").eq("portal_token", data.token).eq("approved", true).single();
    if (!c) throw new Error("Neplatný přístup");
    const { error } = await db.rpc("set_craftsman_state", { p_id: c.id, p_approved: true, p_available: data.available });
    if (error) throw new Error("Nejdřív dokončete aktivní zakázku.");
    return { ok: true };
  });

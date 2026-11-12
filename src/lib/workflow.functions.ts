import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canProgress } from "./regions";

const tokenSchema = z.object({ token: z.string().uuid() });

export const trackOrder = createServerFn({ method: "POST" }).inputValidator(tokenSchema).handler(async ({ data }) => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: r, error } = await db.from("service_requests").select("status,trade,urgency,arrival_minutes,assigned_craftsman_id,updated_at").eq("tracking_token", data.token).single();
  if (error || !r) throw new Error("Objednávka nenalezena");
  let name: string | null = null;
  if (r.assigned_craftsman_id) { const { data: c } = await db.from("craftsman_applications").select("name").eq("id", r.assigned_craftsman_id).single(); name = c?.name ?? null; }
  return { status: r.status, trade: r.trade, urgency: r.urgency, arrival_minutes: r.arrival_minutes, updated_at: r.updated_at, craftsman: name };
});

export const craftsmanPortal = createServerFn({ method: "POST" }).inputValidator(tokenSchema).handler(async ({ data }) => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: c, error } = await db.from("craftsman_applications").select("id,name,approved,available,region,trade").eq("portal_token", data.token).single();
  if (error || !c || !c.approved) throw new Error("Přístup není schválen nebo odkaz není platný");
  const { data: offers, error: oe } = await db.from("job_offers").select("id,state,service_requests(id,city,region,description,trade,urgency,status,assigned_craftsman_id)").eq("craftsman_id", c.id).in("state", ["pending", "accepted"]).order("created_at", { ascending: false }).limit(50);
  if (oe) throw new Error("Načtení nabídek selhalo");
  const { data: jobs, error: je } = await db.from("service_requests").select("id,address,city,district,phone,status,arrival_minutes,description").eq("assigned_craftsman_id", c.id).order("created_at", { ascending: false }).limit(50);
  if (je) throw new Error("Načtení zakázek selhalo");
  return { craftsman: c, offers: (offers ?? []).filter(o => o.state === "pending" && o.service_requests && !o.service_requests.assigned_craftsman_id && ["nova", "oslovovani"].includes(o.service_requests.status)), jobs: jobs ?? [] };
});

export const acceptOffer = createServerFn({ method: "POST" }).inputValidator(tokenSchema.extend({ offer: z.string().uuid(), minutes: z.number().int().min(10).max(600) })).handler(async ({ data }) => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { error } = await db.rpc("accept_job_offer", { p_token: data.token, p_offer: data.offer, p_minutes: data.minutes });
  if (error) throw new Error("Zakázka již není dostupná nebo nejste volný.");
  return { ok: true };
});

export const progressJob = createServerFn({ method: "POST" }).inputValidator(tokenSchema.extend({ id: z.string().uuid(), status: z.enum(["na_ceste", "dokonceno"]) })).handler(async ({ data }) => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: c } = await db.from("craftsman_applications").select("id").eq("portal_token", data.token).eq("approved", true).single();
  if (!c) throw new Error("Neplatný přístup");
  const { data: r } = await db.from("service_requests").select("status").eq("id", data.id).eq("assigned_craftsman_id", c.id).single();
  if (!r || !canProgress(r.status, data.status)) throw new Error("Nepovolená změna stavu");
  const { data: rows, error } = await db.from("service_requests").update({ status: data.status, updated_at: new Date().toISOString() }).eq("id", data.id).eq("assigned_craftsman_id", c.id).eq("status", r.status).select("id");
  if (error || !rows?.length) throw new Error("Stav se mezitím změnil");
  return { ok: true };
});

export const setCraftsman = createServerFn({ method: "POST" }).inputValidator(z.object({ pin: z.string().max(200), id: z.string().uuid(), approved: z.boolean(), available: z.boolean() })).handler(async ({ data }) => {
  if (!process.env["DISPATCH_PIN"] || data.pin !== process.env["DISPATCH_PIN"]) throw new Error("Neplatný PIN");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  if (data.available) {
    const { data: active } = await db.from("service_requests").select("id").eq("assigned_craftsman_id", data.id).in("status", ["prijato", "na_ceste"]).limit(1);
    if (active?.length) throw new Error("Řemeslník má aktivní zakázku");
  }
  const { error } = await db.from("craftsman_applications").update({ approved: data.approved, available: data.approved && data.available }).eq("id", data.id);
  if (error) throw new Error("Uložení řemeslníka selhalo");
  return { ok: true };
});
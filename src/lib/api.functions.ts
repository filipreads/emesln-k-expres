import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { REGIONS } from "./regions";

export const TRADES = ["voda", "elektro", "zamecnik", "manzel"] as const;
export const STATUSES = ["nova", "oslovovani", "prijato", "na_ceste", "dokonceno"] as const;

import { emailSchema, canChangeStatus } from "./communication";

const requestSchema = z.object({
  urgency: z.enum(["havarie", "dnes", "planovano"]),
  preferred_time: z.string().datetime({ offset: true }).optional().transform((v) => v || null),
  trade: z.enum(TRADES),
  address: z.string().trim().min(3).max(200),
  district: z.string().trim().min(2).max(100),
  region: z.enum(REGIONS),
  description: z.string().trim().min(5).max(2000),
  email: emailSchema,
  customer_name: z.string().trim().max(100).optional().transform((v) => v || null),
  postal_code: z.string().trim().regex(/^(\d{3}\s?\d{2})?$/, "PSČ má 5 číslic").optional().transform((v) => v || null),
});

async function optionalUser(db: Awaited<ReturnType<typeof admin>>) {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const h = getRequestHeader("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const { data } = await db.auth.getUser(h.slice(7));
  return data.user?.id ?? null;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const submitRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Neplatná data");
    return d;
  })
  .handler(async ({ data }) => {
    const parsed = requestSchema.refine((r) => r.urgency !== "planovano" || !!r.preferred_time, "Vyberte termín návštěvy").parse(Object.fromEntries(
      ["urgency", "trade", "address", "district", "region", "description", "email", "postal_code", "customer_name", "preferred_time"].map((k) => [k, data.get(k) ?? undefined]),
    ));
    const db = await admin();
    let photo_path: string | null = null;
    const file = data.get("photo");
    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Fotka musí být JPG, PNG nebo WebP do 10 MB");
      const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5);
      photo_path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("request-photos").upload(photo_path, file, { contentType: file.type });
      if (error) throw new Error("Nahrání fotky selhalo");
    }
    const { data: row, error } = await db
      .from("service_requests")
      .insert({ ...parsed, city: parsed.district, photo_path, customer_user_id: await optionalUser(db) })
      .select("id,tracking_token")
      .single();
    if (error) throw new Error(error.message.includes("submission_rate_limit") ? "Příliš mnoho požadavků. Zkuste to za hodinu." : "Uložení selhalo");
    try {
      const { analyze, createOffers } = await import("./workflow.server");
      let image: string | undefined;
      if (photo_path) {
        const { data: signed, error: se } = await db.storage.from("request-photos").createSignedUrl(photo_path, 120);
        if (se || !signed) throw new Error("Fotografii se nepodařilo připravit k rozboru.");
        image = signed.signedUrl;
      }
      const ai = await analyze(parsed.description, image);
      const { error: ae } = await db.from("service_requests").update({ trade: ai.trade, urgency: parsed.urgency === "dnes" ? ai.urgency : parsed.urgency, ai_reason: ai.reason, automation_note: ai.review ? "AI doporučuje kontrolu dispečerem. " + ai.reason : null }).eq("id", row.id);
      if (ae) throw new Error("Uložení rozboru selhalo");
      if (!ai.review) await createOffers(row.id);
    } catch (e) {
      await db.from("service_requests").update({ automation_note: e instanceof Error ? e.message : "Automatizace vyžaduje kontrolu dispečerem." }).eq("id", row.id);
    }
    return { id: row.id, token: row.tracking_token };
  });

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(2).max(100),
      trade: z.enum(TRADES),
      area: z.string().trim().min(2).max(200),
      region: z.enum(REGIONS),
      email: emailSchema,
    }),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("craftsman_applications").insert({ ...data, user_id: await optionalUser(db) });
    if (error) throw new Error(error.message.includes("submission_rate_limit") ? "Příliš mnoho požadavků. Zkuste to za hodinu." : "Uložení selhalo");
    return { ok: true };
  });

function checkPin(pin: string) {
  const real = process.env["DISPATCH_PIN"];
  if (!real || pin !== real) throw new Error("Neplatný PIN dispečinku");
}

export const listDashboard = createServerFn({ method: "POST" })
  .inputValidator(z.object({ pin: z.string().max(200) }))
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const db = await admin();
    const [requestsResult, craftsResult] = await Promise.all([
      db.from("service_requests").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("craftsman_applications").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const { data: callbacks } = await db.from("contact_messages").select("*").eq("handled", false).order("created_at", { ascending: false }).limit(100);
    if (requestsResult.error || craftsResult.error) throw new Error("Načtení nástěnky selhalo");
    const withPhotos = await Promise.all((requestsResult.data ?? []).map(async r => {
      if (!r.photo_path) return { ...r, photo_url: null as string | null };
      const { data: signed } = await db.storage.from("request-photos").createSignedUrl(r.photo_path, 3600);
      return { ...r, photo_url: signed?.signedUrl ?? null };
    }));
    const { data: ratings } = await db.from("ratings").select("stars").eq("direction", "customer_to_craftsman");
    const { data: events } = await db.from("request_events").select("request_id,event,actor,created_at").order("created_at", { ascending: false }).limit(500);
    return { requests: withPhotos, craftsmen: craftsResult.data ?? [], callbacks: callbacks ?? [], events: events ?? [], average: ratings?.length ? Math.round(ratings.reduce((sum,r) => sum+r.stars,0)/ratings.length*10)/10 : null };

  });

export const updateRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ pin: z.string().max(200), id: z.string().uuid(), status: z.enum(STATUSES).optional(), broadcast: z.boolean().optional() }),
  )
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const db = await admin();
    const { data: cur } = await db.from("service_requests").select("broadcast_count,status,cancelled_at").eq("id", data.id).single();
    if (!cur || cur.cancelled_at) throw new Error("Zakázka nenalezena");
    if (data.status && !canChangeStatus(cur.status, data.status)) throw new Error("Nepovolená změna stavu. Přijetí provádí přiřazený mistr.");
    if (data.broadcast) {
      const { createOffers } = await import("./workflow.server");
      const result = await createOffers(data.id);
      return result;
    }
    const { error } = await db.rpc("change_request", { p_id: data.id, p_actor: "dispecink", ...(data.status ? { p_status: data.status } : {}) });
    if (error) throw new Error("Aktualizace selhala");
    return { ok: true };
  });

export const getAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data } = await db.from("availability").select("available_count,eta_minutes,updated_at").eq("id", 1).maybeSingle();
  return data ?? { available_count: 0, eta_minutes: 90, updated_at: new Date(0).toISOString() };
});

export const setAvailability = createServerFn({ method: "POST" })
  .inputValidator(z.object({ pin: z.string().max(200), available_count: z.number().int().min(0).max(500), eta_minutes: z.number().int().min(10).max(600) }))
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const db = await admin();
    const { error } = await db.from("availability").upsert({ id: 1, available_count: data.available_count, eta_minutes: data.eta_minutes, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message.includes("submission_rate_limit") ? "Příliš mnoho požadavků. Zkuste to za hodinu." : "Uložení selhalo");
    return { ok: true };
  });

export const classifyIssue = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Neplatná data");
    const parsed = z.object({ pin: z.string().max(200), description: z.string().trim().min(5).max(2000) }).parse({ pin: d.get("pin"), description: d.get("description") });
    return { ...parsed, photo: d.get("photo") };
  })
  .handler(async ({ data }) => {
    checkPin(data.pin);
    let image: string | undefined;
    if (data.photo instanceof File && data.photo.size > 0) {
      if (data.photo.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(data.photo.type)) throw new Error("Fotka musí být JPG, PNG nebo WebP do 10 MB");
      const { Buffer } = await import("node:buffer");
      image = `data:${data.photo.type};base64,${Buffer.from(await data.photo.arrayBuffer()).toString("base64")}`;
    }
    const { analyze } = await import("./workflow.server");
    return analyze(data.description, image);
  });

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: emailSchema, trade: z.enum(TRADES), message: z.string().trim().min(5).max(2000) }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("contact_messages").insert(data);
    if (error) throw new Error(error.message.includes("submission_rate_limit") ? "Příliš mnoho požadavků. Zkuste to za hodinu." : "Uložení selhalo");
    return { ok: true };
  });

export const markContact = createServerFn({ method: "POST" })
  .inputValidator(z.object({ pin: z.string().max(200), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const db = await admin();
    const { error } = await db.from("contact_messages").update({ handled: true }).eq("id", data.id);
    if (error) throw new Error(error.message.includes("submission_rate_limit") ? "Příliš mnoho požadavků. Zkuste to za hodinu." : "Uložení selhalo");
    return { ok: true };
  });

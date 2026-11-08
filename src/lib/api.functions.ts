import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const TRADES = ["voda", "elektro", "zamecnik", "manzel"] as const;
export const STATUSES = ["nova", "oslovovani", "prijato", "na_ceste", "dokonceno"] as const;

const phone = z
  .string()
  .trim()
  .regex(/^(\+420)?\s?\d{3}\s?\d{3}\s?\d{3}$/, "Zadejte platné české telefonní číslo");

const requestSchema = z.object({
  urgency: z.enum(["havarie", "dnes"]),
  trade: z.enum(TRADES),
  address: z.string().trim().min(3).max(200),
  district: z.string().trim().min(2).max(60),
  description: z.string().trim().min(5).max(2000),
  phone,
});

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
    const parsed = requestSchema.parse(Object.fromEntries(
      ["urgency", "trade", "address", "district", "description", "phone"].map((k) => [k, data.get(k)]),
    ));
    const db = await admin();
    let photo_path: string | null = null;
    const file = data.get("photo");
    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024 || !file.type.startsWith("image/"))
        throw new Error("Fotka musí být obrázek do 10 MB");
      const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5);
      photo_path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("request-photos").upload(photo_path, file, { contentType: file.type });
      if (error) throw new Error("Nahrání fotky selhalo");
    }
    const { data: row, error } = await db
      .from("service_requests")
      .insert({ ...parsed, photo_path })
      .select("id")
      .single();
    if (error) throw new Error("Uložení selhalo");
    return { id: row.id };
  });

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(2).max(100),
      trade: z.enum(TRADES),
      area: z.string().trim().min(2).max(200),
      phone,
    }),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("craftsman_applications").insert(data);
    if (error) throw new Error("Uložení selhalo");
    return { ok: true };
  });

function checkPin(pin: string) {
  const real = process.env.DISPATCH_PIN;
  if (!real || pin !== real) throw new Error("Neplatný PIN dispečinku");
}

export const listDashboard = createServerFn({ method: "POST" })
  .inputValidator(z.object({ pin: z.string().max(200) }))
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const db = await admin();
    const [{ data: requests }, { data: crafts }] = await Promise.all([
      db.from("service_requests").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("craftsman_applications").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const withPhotos = await Promise.all(
      (requests ?? []).map(async (r) => {
        if (!r.photo_path) return { ...r, photo_url: null as string | null };
        const { data: s } = await db.storage.from("request-photos").createSignedUrl(r.photo_path, 3600);
        return { ...r, photo_url: s?.signedUrl ?? null };
      }),
    );
    return { requests: withPhotos, craftsmen: crafts ?? [] };
  });

export const updateRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ pin: z.string().max(200), id: z.string().uuid(), status: z.enum(STATUSES).optional(), broadcast: z.boolean().optional() }),
  )
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const db = await admin();
    const { data: cur } = await db.from("service_requests").select("broadcast_count,status").eq("id", data.id).single();
    if (!cur) throw new Error("Zakázka nenalezena");
    const patch: { status?: (typeof STATUSES)[number]; broadcast_count?: number; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (data.status) patch.status = data.status;
    if (data.broadcast) {
      patch.broadcast_count = cur.broadcast_count + 1;
      if (cur.status === "nova") patch.status = "oslovovani";
    }
    const { error } = await db.from("service_requests").update(patch).eq("id", data.id);
    if (error) throw new Error("Aktualizace selhala");
    return { ok: true };
  });

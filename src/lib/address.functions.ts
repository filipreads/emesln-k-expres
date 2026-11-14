import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { REGIONS, type Region } from "./regions";

export type AddressSuggestion = { label: string; street: string; city: string; postal_code: string; region: Region | null };

export function toRegion(state: string | undefined): Region | null {
  if (!state) return null;
  if (state.includes("Praha")) return "Praha";
  if (state.includes("Vysočina")) return "Kraj Vysočina";
  return (REGIONS as readonly string[]).includes(state) ? (state as Region) : null;
}

export const suggestAddress = createServerFn({ method: "POST" })
  .inputValidator(z.object({ q: z.string().trim().min(2).max(120), postcode: z.boolean().optional() }))
  .handler(async ({ data }) => {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", data.q);
    url.searchParams.set("limit", "6");
    url.searchParams.set("bbox", "12.09,48.55,18.86,51.06");
    if (data.postcode) url.searchParams.set("osm_tag", "place:postcode");
    try {
      const res = await fetch(url, { headers: { "User-Agent": "FofrMistr/1.0" } });
      if (!res.ok) return [] as AddressSuggestion[];
      const json = (await res.json()) as { features: { properties: Partial<Record<"countrycode"|"osm_value"|"street"|"type"|"name"|"housenumber"|"city"|"district"|"postcode"|"state", string>> }[] };
      const out: AddressSuggestion[] = [];
      for (const { properties: p } of json.features ?? []) {
        if (p.countrycode !== "CZ") continue;
        const isPostcode = p.osm_value === "postcode";
        const street = isPostcode ? "" : [p.street ?? (p.type === "street" ? p.name : p.name), p.housenumber].filter(Boolean).join(" ");
        const city = p.city ?? p.district ?? p.name ?? "";
        const postal_code = (isPostcode ? p.name : p.postcode) ?? "";
        const label = [street, postal_code, city].filter(Boolean).join(", ");
        if (!out.some((o) => o.label === label)) out.push({ label, street, city, postal_code, region: toRegion(p.state) });
      }
      return out;
    } catch {
      return [] as AddressSuggestion[];
    }
  });

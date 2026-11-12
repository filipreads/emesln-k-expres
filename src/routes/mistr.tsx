import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { craftsmanPortal, acceptOffer, progressJob } from "@/lib/workflow.functions";
import { STATUS_LABEL } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/mistr")({
  validateSearch: z.object({ token: z.string().optional().catch(undefined) }),
  head: () => ({ meta: [{ title: "Moje zakázky – Fofr Mistr" }, { name: "description", content: "Soukromý přehled nabídek a přijatých zakázek řemeslníka." }, { property: "og:title", content: "Moje zakázky – Fofr Mistr" }, { property: "og:description", content: "Přijetí zakázky a potvrzení příjezdu řemeslníkem." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }, { name: "referrer", content: "no-referrer" }] }),
  component: Portal,
});

function Portal() {
  const { token } = Route.useSearch();
  const [data, setData] = useState<Awaited<ReturnType<typeof craftsmanPortal>> | null>(null);
  const [error, setError] = useState("");
  const [minutes, setMinutes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!token || !z.string().uuid().safeParse(token).success) { setError("Otevřete soukromý odkaz od dispečinku."); return; }
    try { setData(await craftsmanPortal({ data: { token } })); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Načtení selhalo"); setData(null); }
  }, [token]);
  useEffect(() => { load(); const interval = setInterval(load, 15000); return () => clearInterval(interval); }, [load]);
  async function act(run: () => Promise<unknown>) { setBusy(true); try { await run(); await load(); } catch(e) { toast.error(e instanceof Error ? e.message : "Změna selhala"); } finally { setBusy(false); } }
  return <div className="min-h-screen bg-muted"><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-10">
    <div className="flex items-center justify-between"><h1 className="text-3xl font-black">Moje zakázky</h1><Button variant="outline" size="icon" aria-label="Obnovit zakázky" onClick={load}><RefreshCw className="h-4 w-4" /></Button></div>
    {error && <p role="alert" className="mt-6 text-destructive">{error}</p>}
    {!data && !error && <p className="mt-6">Načítání…</p>}
    {data && <>
      <p className="mt-4 font-semibold">{data.craftsman.name} · {data.craftsman.region} · {data.craftsman.available ? "Volný" : "Nedostupný"}</p>
      <h2 className="mt-8 text-xl font-bold">Nabídky</h2>
      {!data.offers.length && <p className="mt-3 text-muted-foreground">Zatím žádné nabídky.</p>}
      <div className="mt-4 space-y-4">{data.offers.map(o => <form key={o.id} className="space-y-3 rounded-lg border border-border bg-card p-5" onSubmit={e => { e.preventDefault(); if (token) act(() => acceptOffer({ data: { token, offer: o.id, minutes: Number(minutes[o.id] ?? "60") } })); }}>
        <h3 className="font-bold">{o.service_requests?.city} · {o.service_requests?.urgency === "havarie" ? "Havárie" : "Oprava dnes"}</h3><p className="text-sm">{o.service_requests?.description}</p>
        <label className="block text-sm">Odhad dojezdu v minutách<Input type="number" required min={10} max={600} value={minutes[o.id] ?? "60"} onChange={e => setMinutes({ ...minutes, [o.id]: e.target.value })} className="mt-1 max-w-40" /></label>
        <Button type="submit" disabled={busy || !data.craftsman.available}>Přijmout zakázku</Button>
      </form>)}</div>
      <h2 className="mt-8 text-xl font-bold">Přijaté zakázky</h2>
      {!data.jobs.length && <p className="mt-3 text-muted-foreground">Žádné přijaté zakázky.</p>}
      <div className="mt-4 space-y-4">{data.jobs.map(j => <article key={j.id} className="rounded-lg border border-border bg-card p-5"><div className="font-bold">{j.address}, {j.city ?? j.district}</div><p className="mt-2 text-sm">{j.description}</p><p className="mt-2 font-semibold text-primary">{STATUS_LABEL[j.status]}</p><a className="mt-2 block text-primary" href={`tel:${j.phone}`}>{j.phone}</a>
        {j.status === "prijato" && <Button className="mt-4" disabled={busy} onClick={() => { if (token) act(() => progressJob({ data: { token, id: j.id, status: "na_ceste" } })); }}>Vyrážím</Button>}
        {j.status === "na_ceste" && <Button className="mt-4" disabled={busy} onClick={() => { if (token) act(() => progressJob({ data: { token, id: j.id, status: "dokonceno" } })); }}>Dokončit zakázku</Button>}
      </article>)}</div>
    </>}
  </main></div>;
}
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { trackOrder } from "@/lib/workflow.functions";
import { STATUS_LABEL, TRADE_INFO, type Trade } from "@/lib/content";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/objednavka")({
  validateSearch: z.object({ token: z.string().optional().catch(undefined) }),
  head: () => ({ meta: [{ title: "Stav objednávky – Fofr Mistr" }, { name: "description", content: "Aktuální stav vaší objednávky a potvrzený čas příjezdu řemeslníka." }, { property: "og:title", content: "Stav objednávky – Fofr Mistr" }, { property: "og:description", content: "Sledujte přijetí zakázky, cestu řemeslníka a dokončení opravy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }, { name: "referrer", content: "no-referrer" }] }),
  component: Tracking,
});

function Tracking() {
  const { token } = Route.useSearch();
  const [data, setData] = useState<Awaited<ReturnType<typeof trackOrder>> | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!token || !z.string().uuid().safeParse(token).success) { setError("Otevřete soukromý odkaz z potvrzení objednávky."); return; }
    try { setData(await trackOrder({ data: { token } })); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Načtení selhalo"); }
  }, [token]);
  useEffect(() => { load(); const interval = setInterval(load, 15000); return () => clearInterval(interval); }, [load]);
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-2xl px-4 py-12">
    <div className="flex items-center justify-between gap-4"><h1 className="text-3xl font-black">Vaše objednávka</h1><Button variant="outline" size="icon" aria-label="Obnovit stav" onClick={load}><RefreshCw className="h-4 w-4" /></Button></div>
    {error && <p role="alert" className="mt-6 text-destructive">{error}</p>}
    {!data && !error && <p className="mt-6 text-muted-foreground">Načítání…</p>}
    {data && <>
      <p className="mt-8 text-sm font-semibold text-primary">{TRADE_INFO[data.trade as Trade]?.name ?? data.trade}</p>
      <h2 className="mt-2 text-2xl font-bold">{STATUS_LABEL[data.status]}</h2>
      <p className="mt-3 text-muted-foreground">{data.craftsman ? `Řemeslník: ${data.craftsman}` : "Hledáme dostupného řemeslníka ve vašem kraji. Příjezd zatím není potvrzen."}</p>
      {data.arrival_minutes && data.status !== "dokonceno" && <p className="mt-4 text-lg font-bold">Potvrzený odhad dojezdu při přijetí: {data.arrival_minutes} minut</p>}
      {data.status === "dokonceno" && <CheckCircle2 className="mt-4 h-10 w-10 text-success" />}
      <ol className="mt-8 divide-y divide-border">{Object.entries(STATUS_LABEL).map(([s,l]) => <li key={s} className={`py-3 ${s === data.status ? "font-bold text-primary" : "text-muted-foreground"}`}>{l}</li>)}</ol>
      <p className="mt-6 text-xs text-muted-foreground">Poslední změna: {new Date(data.updated_at).toLocaleString("cs-CZ")}</p>
    </>}
  </main><SiteFooter /></div>;
}
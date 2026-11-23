import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { RefreshCw, CheckCircle2, Circle, Mail, Bell, CalendarClock } from "lucide-react";
import { RatingForm } from "@/components/RatingForm";
import { trackOrder, rateCraftsman } from "@/lib/workflow.functions";
import { STATUS_LABEL, STATUS_STORY, TRADE_INFO, urgencyLabel, formatPreferredTime, shouldShowArrivalCountdown, type Trade } from "@/lib/content";
import { readOrders, rememberOrder, type RecentOrder } from "@/lib/recent-orders";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DISPATCH_EMAIL } from "@/lib/communication";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/objednavka")({
  validateSearch: z.object({ token: z.string().optional().catch(undefined) }),
  head: () => ({ meta: [{ title: "Stav objednávky – Fofr Mistr" }, { name: "description", content: "Aktuální stav vaší objednávky a potvrzený čas příjezdu řemeslníka." }, { property: "og:title", content: "Stav objednávky – Fofr Mistr" }, { property: "og:description", content: "Sledujte přijetí zakázky, cestu řemeslníka a dokončení opravy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }, { name: "referrer", content: "no-referrer" }] }),
  component: Tracking,
});

type Order = Awaited<ReturnType<typeof trackOrder>>;

function chime() {
  try {
    const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.5);
    navigator.vibrate?.(200);
  } catch { /* ignore */ }
}

function Countdown({ from, minutes }: { from: string; minutes: number }) {
  const target = new Date(from).getTime() + minutes * 60000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);
  const left = Math.round((target - now) / 60000);
  return <p className="mt-4 text-lg font-bold">{left > 0 ? `Mistr dorazí přibližně za ${left} min` : "Mistr by měl dorazit každou chvíli"}</p>;
}

function Tracking() {
  const { token } = Route.useSearch();
  const [data, setData] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const lastStatus = useRef<string | null>(null);
  const valid = !!token && z.string().uuid().safeParse(token).success;

  const load = useCallback(async () => {
    if (!valid) { setError("Otevřete soukromý odkaz z potvrzení objednávky."); return; }
    try {
      const r = await trackOrder({ data: { token: token ?? "" } });
      if (lastStatus.current && lastStatus.current !== r.status) chime();
      lastStatus.current = r.status;
      setData(r); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Načtení selhalo"); }
  }, [token, valid]);

  useEffect(() => { setRecent(readOrders()); }, []);
  useEffect(() => { if (valid && data) rememberOrder({ token: token ?? "", id: "", trade: data.trade, at: data.updated_at, ...readOrders().find((o) => o.token === token) }); }, [valid, token, data]);

  useEffect(() => {
    load();
    // Fallback poll in case the live channel drops; live updates arrive instantly.
    const interval = setInterval(load, 60000);
    if (!valid) return () => clearInterval(interval);
    const ch = supabase.channel(`order:${token}`).on("broadcast", { event: "changed" }, () => { load(); }).subscribe();
    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => { clearInterval(interval); supabase.removeChannel(ch); document.removeEventListener("visibilitychange", onFocus); };
  }, [load, valid, token]);

  const steps = Object.entries(STATUS_LABEL) as [keyof typeof STATUS_LABEL, string][];
  const cur = data ? steps.findIndex(([k]) => k === data.status) : -1;
  const story = data?.cancelled_at ? "Objednávka byla zrušena." : data?.urgency === "planovano" && data.status === "prijato"
    ? "Mistr zakázku přijal. Požadovaný termín vám potvrdí dispečink."
    : data ? STATUS_STORY[data.status] : "";

  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-2xl px-4 py-12">
    <div className="flex items-center justify-between gap-4"><h1 className="text-2xl font-black sm:text-3xl">Vaše objednávka</h1>{valid && <Button variant="outline" size="icon" aria-label="Obnovit stav" onClick={load}><RefreshCw className="h-4 w-4" /></Button>}</div>

    {!valid && <div className="mt-6 space-y-4">
      <p className="text-muted-foreground">Otevřete soukromý odkaz z potvrzení objednávky{recent.length ? ", nebo vyberte objednávku z tohoto zařízení:" : "."}</p>
      {recent.length > 0 && <ul className="space-y-2">{recent.map((o) => <li key={o.token}><Link to="/objednavka" search={{ token: o.token }} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 font-semibold hover:border-primary">
        <span>{TRADE_INFO[o.trade as Trade]?.name ?? o.trade}{o.id ? ` · FM-${o.id.slice(0, 8).toUpperCase()}` : ""}</span>
        <span className="text-sm font-normal text-muted-foreground">{new Date(o.at).toLocaleDateString("cs-CZ")}</span></Link></li>)}</ul>}
    </div>}

    {valid && error && <p role="alert" className="mt-6 text-destructive">{error}</p>}
    {valid && !data && !error && <div className="mt-8 space-y-3" aria-label="Načítání"><div className="h-5 w-32 animate-pulse rounded bg-muted" /><div className="h-8 w-64 animate-pulse rounded bg-muted" /><div className="h-48 animate-pulse rounded-xl bg-muted" /></div>}

    {data && <>
      <div className="mt-8 flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-primary">{TRADE_INFO[data.trade as Trade]?.name ?? data.trade}</span><Badge variant={data.urgency === "havarie" ? "destructive" : "secondary"}>{urgencyLabel(data.urgency)}</Badge></div>
      <h2 className="mt-2 text-2xl font-bold" aria-live="polite">{data.cancelled_at ? "Zrušeno" : STATUS_LABEL[data.status]}</h2>
      <p className="mt-3 text-lg">{story}</p>
      {data.craftsman && <p className="mt-2 text-muted-foreground">Váš mistr: <span className="font-semibold text-foreground">{data.craftsman}</span></p>}
      {data.urgency === "planovano" && data.status !== "dokonceno" && <p className="mt-3 flex items-start gap-2 font-semibold"><CalendarClock className="h-5 w-5 shrink-0 text-primary" /><span>Požadovaný termín: {data.preferred_time ? <time dateTime={data.preferred_time}>{formatPreferredTime(data.preferred_time)}</time> : "Neuveden – ověřte s dispečinkem"}</span></p>}
      {!data.cancelled_at && shouldShowArrivalCountdown(data) && data.arrival_minutes !== null && <Countdown from={data.updated_at} minutes={data.arrival_minutes} />}
      <Button asChild variant="outline" className="mt-5"><a href={`mailto:${DISPATCH_EMAIL}?subject=${encodeURIComponent("Dotaz k objednávce " + (token ?? ""))}`}><Mail />Napsat dispečinku</a></Button>
      {data.craftsman_email && <Button asChild size="lg" className="mt-5 w-full sm:w-auto"><a href={`mailto:${data.craftsman_email}`}><Mail className="h-5 w-5" />Napsat mistrovi</a></Button>}
      {data.status === "dokonceno" && <CheckCircle2 className="mt-4 h-10 w-10 text-success" />}

      <ol hidden={!!data.cancelled_at} className="mt-8 rounded-xl border border-border bg-card p-4">{steps.map(([s, l], i) => <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
        {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-3 top-7 bottom-0 w-px", i < cur ? "bg-primary" : "bg-border")} />}
        <span className={cn("relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", i === cur ? "bg-primary text-primary-foreground" : i < cur ? "text-primary" : "text-muted-foreground")}>{i < cur ? <CheckCircle2 className="h-6 w-6" /> : <Circle className={cn("h-4 w-4", i === cur && "animate-pulse fill-current")} />}</span>
        <div className={cn(i === cur ? "font-bold" : i < cur ? "text-foreground" : "text-muted-foreground")}>{l}{i === cur && <p className="text-sm font-normal text-muted-foreground">{story}</p>}</div>
      </li>)}</ol>

      {!data.cancelled_at && data.status !== "dokonceno" && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Bell className="h-4 w-4" />Stránka se aktualizuje sama a při změně krátce zazvoní.</p>}

      {data.status === "dokonceno" && <div className="mt-8">{data.rated ? <p className="rounded-xl border border-border bg-card p-5 font-semibold">Děkujeme, vaše hodnocení jsme dostali.</p> : <RatingForm title={`Jak jste byli spokojeni${data.craftsman ? ` s mistrem ${data.craftsman}` : ""}?`} allowPublic onSubmit={async v => { await rateCraftsman({ data: { token: token ?? "", ...v } }); await load(); }} />}</div>}
      <p className="mt-6 text-xs text-muted-foreground">Poslední změna: {new Date(data.updated_at).toLocaleString("cs-CZ")}</p>
    </>}
  </main><SiteFooter /></div>;
}

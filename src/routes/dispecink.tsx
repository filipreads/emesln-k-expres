import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Radio, RefreshCw, Siren, Sparkles } from "lucide-react";
import { listDashboard, updateRequest, getAvailability, setAvailability, classifyIssue, STATUSES } from "@/lib/api.functions";
import { STATUS_LABEL, TRADE_INFO, type Trade } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dispecink")({
  head: () => ({
    meta: [
      { title: "Dispečink – Fofr Mistr" },
      { name: "description", content: "Interní nástěnka dispečinku." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Dispečink – Fofr Mistr" },
      { property: "og:description", content: "Interní nástěnka dispečinku." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Data = Awaited<ReturnType<typeof listDashboard>>;
type Status = (typeof STATUSES)[number];

function Dashboard() {
  const [pin, setPin] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"req" | "crafts">("req");

  const [avail, setAvail] = useState({ count: "0", eta: "90" });
  const load = useCallback(async (p: string) => {
    try {
      getAvailability().then((a) => setAvail({ count: String(a.available_count), eta: String(a.eta_minutes) }));
      const d = await listDashboard({ data: { pin: p } });
      setData(d);
      sessionStorage.setItem("dpin", p);
    } catch {
      toast.error("Neplatný PIN");
      setData(null);
    }
  }, []);

  useEffect(() => {
    const p = sessionStorage.getItem("dpin");
    if (p) { setPin(p); load(p); }
  }, [load]);

  async function act(id: string, patch: { status?: Status; broadcast?: boolean }) {
    try {
      await updateRequest({ data: { pin, id, ...patch } });
      if (patch.broadcast) toast.success("Broadcast odeslán řemeslníkům v okolí (simulace)");
      load(pin);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Chyba"); }
  }

  const [issue, setIssue] = useState("");
  const [ai, setAi] = useState<Awaited<ReturnType<typeof classifyIssue>> | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  async function runAi() {
    setAiBusy(true); setAi(null);
    try { setAi(await classifyIssue({ data: { pin, description: issue } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Chyba"); }
    finally { setAiBusy(false); }
  }

  async function saveAvail() {
    try {
      await setAvailability({ data: { pin, available_count: Number(avail.count) || 0, eta_minutes: Math.max(10, Number(avail.eta) || 90) } });
      toast.success("Dostupnost uložena – úvodní stránka ji ukazuje");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Chyba"); }
  }

  if (!data)
    return (
      <div className="min-h-screen bg-muted">
        <SiteHeader />
        <form onSubmit={(e) => { e.preventDefault(); load(pin); }} className="mx-auto mt-24 max-w-sm space-y-4 rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-black">Dispečink</h1>
          <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN dispečinku" />
          <Button type="submit" className="w-full">Vstoupit</Button>
        </form>
      </div>
    );

  const counts = Object.fromEntries(STATUSES.map((s) => [s, data.requests.filter((r) => r.status === s).length]));

  return (
    <div className="min-h-screen bg-muted">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-black">Concierge nástěnka</h1>
          <div className="flex gap-2">
            <Button variant={tab === "req" ? "default" : "outline"} onClick={() => setTab("req")}>Poptávky</Button>
            <Button variant={tab === "crafts" ? "default" : "outline"} onClick={() => setTab("crafts")}>Řemeslníci ({data.craftsmen.length})</Button>
            <Button variant="outline" size="icon" onClick={() => load(pin)}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); saveAvail(); }} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <div className="font-bold">Dostupnost na webu</div>
          <label className="text-sm">Volní mistři<Input type="number" min={0} value={avail.count} onChange={(e) => setAvail({ ...avail, count: e.target.value })} className="w-28" /></label>
          <label className="text-sm">Odhad dojezdu (min)<Input type="number" min={10} value={avail.eta} onChange={(e) => setAvail({ ...avail, eta: e.target.value })} className="w-28" /></label>
          <Button type="submit">Uložit</Button>
          <p className="text-xs text-muted-foreground">Po 12 h bez aktualizace web ukáže „na dotaz“.</p>
        </form>

        <form onSubmit={(e) => { e.preventDefault(); runAi(); }} className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-primary" /> AI třídění závady</div>
          <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={2} minLength={5} maxLength={2000} placeholder="Popis od zákazníka, např. teče voda ze stropu od souseda" />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={aiBusy || issue.trim().length < 5}>{aiBusy ? "Analyzuji…" : "Určit obor a naléhavost"}</Button>
            {ai && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {ai.urgency === "havarie"
                  ? <span className="rounded bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">HAVÁRIE</span>
                  : <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">DNES</span>}
                <span className="font-bold">{TRADE_INFO[ai.trade].name}</span>
                <span className="text-muted-foreground">– {ai.reason}</span>
              </div>
            )}
          </div>
        </form>

        {tab === "req" ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              {STATUSES.map((s) => (
                <div key={s} className="rounded-lg border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</div>
                  <div className="text-2xl font-black">{counts[s]}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {data.requests.length === 0 && <p className="text-muted-foreground">Zatím žádné poptávky.</p>}
              {data.requests.map((r) => (
                <div key={r.id} className={cn("rounded-xl border bg-card p-5", r.urgency === "havarie" && r.status !== "dokonceno" ? "border-destructive" : "border-border")}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4">
                      {r.photo_url && <a href={r.photo_url} target="_blank" rel="noreferrer"><img src={r.photo_url} alt="Fotka závady" className="h-20 w-20 rounded-md object-cover" /></a>}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {r.urgency === "havarie"
                            ? <span className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground"><Siren className="h-3 w-3" /> HAVÁRIE</span>
                            : <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">DNES</span>}
                          <span className="font-bold">{TRADE_INFO[r.trade as Trade]?.name ?? r.trade}</span>
                          <span className="text-sm text-muted-foreground">· {new Date(r.created_at).toLocaleString("cs-CZ")}</span>
                        </div>
                        <div className="mt-1 font-semibold">{r.address}, {r.district}</div>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{r.description}</p>
                        <a href={`tel:${r.phone}`} className="mt-1 inline-block text-sm font-semibold text-primary">{r.phone}</a>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => act(r.id, { broadcast: true })} disabled={r.status === "dokonceno"}>
                        <Radio className="mr-1 h-4 w-4" /> Broadcast {r.broadcast_count > 0 && `(${r.broadcast_count}×)`}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {STATUSES.map((s, i) => {
                      const cur = STATUSES.indexOf(r.status as Status);
                      return (
                        <button key={s} onClick={() => act(r.id, { status: s })}
                          className={cn("rounded-full px-3 py-1 text-xs font-semibold transition",
                            i < cur ? "bg-primary/20 text-foreground" : i === cur ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>
                          {STATUS_LABEL[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {data.craftsmen.length === 0 && <p className="p-5 text-muted-foreground">Zatím žádné přihlášky.</p>}
            {data.craftsmen.map((c) => (
              <div key={c.id} className="flex flex-wrap justify-between gap-2 p-4">
                <div><div className="font-bold">{c.name}</div><div className="text-sm text-muted-foreground">{TRADE_INFO[c.trade as Trade]?.name} · {c.area}</div></div>
                <a href={`tel:${c.phone}`} className="font-semibold text-primary">{c.phone}</a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

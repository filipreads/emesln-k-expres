import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Radio, RefreshCw, Siren, Sparkles } from "lucide-react";
import { listDashboard, updateRequest, getAvailability, setAvailability, classifyIssue, markContact, STATUSES } from "@/lib/api.functions";
import { STATUS_LABEL, TRADE_INFO, formatPreferredTime, type Trade } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { setCraftsman } from "@/lib/workflow.functions";
import { DispatchOrderControls } from "@/components/DispatchOrderControls";
import { REGIONS } from "@/lib/regions";
import { canChangeStatus } from "@/lib/communication";
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

  const [filters, setFilters] = useState({ search: "", status: "", trade: "", region: "", urgency: "" });
  const lastIds = useRef<Set<string> | null>(null);
  const [avail, setAvail] = useState({ count: "0", eta: "90" });
  const load = useCallback(async (p: string) => {
    try {

      const d = await listDashboard({ data: { pin: p } });
      if (lastIds.current && d.requests.some(r => !lastIds.current?.has(r.id))) toast.info("Nová objednávka na dispečinku");
      lastIds.current = new Set(d.requests.map(r => r.id));
      setData(d);
      sessionStorage.setItem("dpin", p);
    } catch {
      toast.error("Přehled se nepodařilo načíst. Zkontrolujte PIN nebo zkuste obnovit.");
    }
  }, []);

  useEffect(() => {
    const p = sessionStorage.getItem("dpin");
    if (p) { setPin(p); load(p); }
  }, [load]);

  useEffect(() => {
    if (!data || !pin) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") load(pin); }, 30000);
    return () => clearInterval(timer);
  }, [!!data, pin, load]);
  useEffect(() => { getAvailability().then(a => setAvail({ count: String(a.available_count), eta: String(a.eta_minutes) })).catch(() => {}); }, []);

  async function act(id: string, patch: { status?: Status; broadcast?: boolean }) {
    try {
      const result = await updateRequest({ data: { pin, id, ...patch } });
      if (patch.broadcast && "count" in result && result.count === 0) toast.info("Žádný vhodný volný řemeslník v kraji.");
      if (patch.broadcast && "count" in result && result.count > 0) toast.success("Nabídky vytvořeny pro dostupné ověřené řemeslníky v kraji.");
      load(pin);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Chyba"); }
  }

  const [issue, setIssue] = useState("");
  const [ai, setAi] = useState<Awaited<ReturnType<typeof classifyIssue>> | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [issuePhoto, setIssuePhoto] = useState<File | null>(null);
  async function runAi() {
    setAiBusy(true); setAi(null);
    try { const form = new FormData(); form.set("pin", pin); form.set("description", issue); if (issuePhoto) form.set("photo", issuePhoto); setAi(await classifyIssue({ data: form })); }
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

  const counts = Object.fromEntries(STATUSES.map((s) => [s, data.requests.filter((r) => !r.cancelled_at && r.status === s).length]));

  const filtered = data.requests.filter(r =>
    (!filters.status || (filters.status === "zruseno" ? !!r.cancelled_at : !r.cancelled_at && r.status === filters.status)) &&
    (!filters.trade || r.trade === filters.trade) && (!filters.region || r.region === filters.region) && (!filters.urgency || r.urgency === filters.urgency) &&
    `${r.address} ${r.city} ${r.email} ${r.customer_name}`.toLocaleLowerCase("cs").includes(filters.search.toLocaleLowerCase("cs")));
  const today = new Date().toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });
  const todayOrders = data.requests.filter(r => new Date(r.created_at).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" }) === today);
  return (
    <div className="min-h-screen bg-muted">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-black sm:text-3xl">Concierge nástěnka</h1>
          <div className="flex gap-2">
            <Button variant={tab === "req" ? "default" : "outline"} onClick={() => setTab("req")}>Poptávky</Button>
            <Button variant={tab === "crafts" ? "default" : "outline"} onClick={() => setTab("crafts")}>Řemeslníci ({data.craftsmen.length})</Button>
            <Button variant="outline" size="icon" onClick={() => load(pin)}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {data.callbacks.length > 0 && (
          <div className="mt-6 rounded-xl border-2 border-primary bg-card p-4">
            <div className="font-bold">Dotazy e-mailem ({data.callbacks.length})</div>
            <ul className="mt-2 space-y-2">
              {data.callbacks.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span><a href={`mailto:${c.email}`} className="font-bold text-primary">{c.email}</a> · {c.trade} · {new Date(c.created_at).toLocaleString("cs-CZ")}</span><p className="w-full whitespace-pre-wrap break-words">{c.message}</p>
                  <Button size="sm" variant="outline" onClick={async () => { await markContact({ data: { pin, id: c.id } }); load(pin); }}>Vyřízeno</Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); saveAvail(); }} className="mt-6 grid grid-cols-2 items-end gap-3 rounded-xl border border-border bg-card p-4 sm:flex sm:flex-wrap">
          <div className="col-span-2 font-bold sm:w-full">Dostupnost sítě v ČR</div>
          <label className="text-sm">Volní mistři<Input type="number" min={0} value={avail.count} onChange={(e) => setAvail({ ...avail, count: e.target.value })} className="mt-1 w-full sm:w-28" /></label>
          <label className="text-sm">Odhad dojezdu (min)<Input type="number" min={10} value={avail.eta} onChange={(e) => setAvail({ ...avail, eta: e.target.value })} className="mt-1 w-full sm:w-28" /></label>
          <Button type="submit" className="col-span-2 sm:col-span-1">Uložit</Button>
          <p className="col-span-2 text-xs text-muted-foreground">Po 12 h bez aktualizace web ukáže „na dotaz“.</p>
        </form>

        <form onSubmit={(e) => { e.preventDefault(); runAi(); }} className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-primary" /> AI třídění závady</div>
          <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={2} minLength={5} maxLength={2000} placeholder="Popis od zákazníka, např. teče voda ze stropu od souseda" />
          <label className="block text-sm">Fotografie závady (JPG, PNG, WebP do 10 MB)<Input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setIssuePhoto(e.target.files?.[0] ?? null)} className="mt-1" /></label>
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

        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Dnešní přehled">{[["Nové dnes", todayOrders.filter(r => !r.cancelled_at && ["nova","oslovovani"].includes(r.status)).length], ["Přijaté dnes", todayOrders.filter(r => !r.cancelled_at && ["prijato","na_ceste"].includes(r.status)).length], ["Dokončeno dnes", data.requests.filter(r => r.status === "dokonceno" && new Date(r.updated_at).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" }) === today).length], ["Průměrné hodnocení", data.average ?? "—"]].map(([label,value]) => <div key={label} className="border-b border-border pb-3"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</section>
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
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input aria-label="Vyhledat objednávku" placeholder="Adresa, e-mail, jméno…" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
              <select aria-label="Stav zakázky" className="rounded-md border border-input bg-background p-2" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}><option value="">Všechny stavy</option>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}<option value="zruseno">Zrušeno</option></select>
              <select aria-label="Obor zakázky" className="rounded-md border border-input bg-background p-2" value={filters.trade} onChange={e => setFilters(p => ({ ...p, trade: e.target.value }))}><option value="">Všechny obory</option>{Object.entries(TRADE_INFO).map(([t,i]) => <option key={t} value={t}>{i.name}</option>)}</select>
              <select aria-label="Kraj zakázky" className="rounded-md border border-input bg-background p-2" value={filters.region} onChange={e => setFilters(p => ({ ...p, region: e.target.value }))}><option value="">Všechny kraje</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
              <select aria-label="Naléhavost zakázky" className="rounded-md border border-input bg-background p-2" value={filters.urgency} onChange={e => setFilters(p => ({ ...p, urgency: e.target.value }))}><option value="">Každá naléhavost</option><option value="havarie">Havárie</option><option value="dnes">Dnes</option><option value="planovano">Plánovaný termín</option></select>
            </div>
            <div className="mt-6 space-y-3">
              {filtered.length === 0 && <p className="text-muted-foreground">Žádné odpovídající poptávky.</p>}
              {filtered.map((r) => (
                <div key={r.id} className={cn("rounded-xl border bg-card p-5", r.urgency === "havarie" && r.status !== "dokonceno" ? "border-destructive" : "border-border")}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-4">
                      {r.photo_url && <a href={r.photo_url} target="_blank" rel="noreferrer"><img src={r.photo_url} alt="Fotka závady" className="h-20 w-20 rounded-md object-cover" /></a>}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {r.urgency === "havarie"
                            ? <span className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground"><Siren className="h-3 w-3" /> HAVÁRIE</span>
                             : <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{r.urgency === "planovano" ? "Plánovaný termín" : "DNES"}</span>}
                          <span className="font-bold">{TRADE_INFO[r.trade as Trade]?.name ?? r.trade}</span>
                          <span className="text-sm text-muted-foreground">· {new Date(r.created_at).toLocaleString("cs-CZ")}</span>
                        </div>
                        <div className="mt-1 font-semibold">{r.address}, {r.city ?? r.district} · {r.region ?? "Kraj neuveden"}</div>
                         {r.urgency === "planovano" && <p className="mt-2 text-sm font-semibold">Požadovaný termín: {r.preferred_time ? <time dateTime={r.preferred_time}>{formatPreferredTime(r.preferred_time)}</time> : "Neuveden – ověřte se zákazníkem"}</p>}
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{r.description}</p>
                        {r.ai_reason && <p className="mt-2 text-sm"><Sparkles className="mr-1 inline h-4 w-4 text-primary" />{r.ai_reason}</p>}
                        {r.automation_note && <p className="mt-2 text-sm font-semibold text-destructive">{r.automation_note}</p>}
                        <Link to="/objednavka" search={{ token: r.tracking_token }} className="mt-2 block text-sm font-semibold text-primary underline underline-offset-4">Sledování pro zákazníka</Link>
                        <a href={`mailto:${r.email ?? ""}`} className="mt-1 inline-block text-sm font-semibold text-primary underline underline-offset-4">{r.customer_name ? `${r.customer_name} · ` : ""}{r.email ?? "E-mail neuveden"}</a>
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                      <Button size="sm" variant="outline" onClick={() => act(r.id, { broadcast: true })} disabled={!!r.cancelled_at || (r.status !== "nova" && r.status !== "oslovovani")}>
                        <Radio className="mr-1 h-4 w-4" /> Vytvořit nabídky
                      </Button>
                    </div>
                  </div>
                  {r.cancelled_at && <p className="mt-4 font-semibold text-destructive">Zrušeno</p>}
                  <div className="mt-4 flex flex-wrap gap-1">
                    {STATUSES.map((s, i) => {
                      const cur = STATUSES.indexOf(r.status as Status);
                      return (
                        <Button variant="ghost" size="sm" key={s} disabled={!!r.cancelled_at || !canChangeStatus(r.status, s)} onClick={() => act(r.id, { status: s })}
                          className={cn("rounded-full px-3 py-1 text-xs font-semibold transition",
                            i < cur ? "bg-secondary text-secondary-foreground" : i === cur ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>
                          {STATUS_LABEL[s]}
                        </Button>
                      );
                    })}
                  </div>
                  <DispatchOrderControls pin={pin} order={r} craftsmen={data.craftsmen} events={data.events} onSaved={() => { load(pin); }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {data.craftsmen.length === 0 && <p className="p-5 text-muted-foreground">Zatím žádné přihlášky.</p>}
            {data.craftsmen.map((c) => (
              <div key={c.id} className="flex flex-wrap justify-between gap-2 p-4">
                <div><div className="font-bold">{c.name}</div><div className="text-sm text-muted-foreground">{TRADE_INFO[c.trade as Trade]?.name} · {c.area} · {c.region ?? "Kraj neuveden"}</div></div>
                <div className="flex flex-wrap items-center gap-3">
                  <a href={`mailto:${c.email}`} className="break-all font-semibold text-primary">{c.email}</a>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.approved} onChange={async e => { try { await setCraftsman({ data: { pin, id: c.id, approved: e.target.checked, available: c.available } }); load(pin); } catch(e) { toast.error(e instanceof Error ? e.message : "Chyba"); } }} />Ověřený</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.available} disabled={!c.approved} onChange={async e => { try { await setCraftsman({ data: { pin, id: c.id, approved: c.approved, available: e.target.checked } }); load(pin); } catch(e) { toast.error(e instanceof Error ? e.message : "Chyba"); } }} />Volný</label>
                  {c.approved && <Link to="/mistr" search={{ token: c.portal_token }} className="text-sm font-semibold text-primary underline underline-offset-4">Soukromý přehled</Link>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

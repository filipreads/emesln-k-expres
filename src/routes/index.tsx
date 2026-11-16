import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, Droplets, KeyRound, Hammer, Zap, ShieldCheck, PhoneCall, Truck, Wallet, ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { RequestForm } from "@/components/RequestForm";
import { getAvailability } from "@/lib/api.functions";
import { TRADE_INFO, HERO_TRADES, HERO_COPY, CALLOUT_FEE, type Trade } from "@/lib/content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fofr Mistr – expresní řemeslník v celé ČR" },
      { name: "description", content: "Havárie vody, zabouchnuté dveře i drobné opravy. Popište závadu, dispečer osloví nejbližšího volného mistra a vy platíte až po hotové práci." },
      { property: "og:title", content: "Fofr Mistr – expresní řemeslník v celé ČR" },
      { property: "og:description", content: "Expresní instalatér, zámečník a hodinový manžel po celé České republice. Platíte až po hotové práci." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getAvailability(),
  component: Index,
});

const ICONS: Record<Trade, typeof Droplets> = { voda: Droplets, elektro: Zap, zamecnik: KeyRound, manzel: Hammer };

const STALE_MS = 12 * 60 * 60 * 1000;

function useAvail() {
  const a = Route.useLoaderData();
  const fresh = Date.now() - new Date(a.updated_at).getTime() < STALE_MS;
  const count = fresh ? a.available_count : 0;
  return { count, eta: a.eta_minutes, open: count > 0, updated: new Date(a.updated_at) };
}

function plural(n: number) { return n === 1 ? "mistr volný" : n >= 2 && n <= 4 ? "mistři volní" : "mistrů volných"; }

function scrollToOrder() {
  const el = document.getElementById("objednat");
  if (!el) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
}

function TradeCard({ trade, selected, onPick }: { trade: Trade; selected: boolean; onPick: (t: Trade) => void }) {
  const Icon = ICONS[trade];
  return (
    <button
      type="button"
      onClick={() => onPick(trade)}
      aria-pressed={selected}
      className={cn(
        "group flex min-h-44 flex-col rounded-2xl border p-6 text-left transition duration-200",
        "hover:-translate-y-1 hover:shadow-hero focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "border-primary bg-primary/10"
          : "border-secondary-foreground/25 bg-secondary-foreground/10 hover:border-primary/60",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-xl transition",
          selected ? "bg-primary text-primary-foreground ring-2 ring-secondary-foreground/30" : "bg-primary/90 text-primary-foreground group-hover:bg-primary",
        )}>
          <Icon className="h-6 w-6" strokeWidth={2.25} />
        </span>
        <span className="shrink-0 rounded-full border border-secondary-foreground/25 bg-secondary-foreground/10 px-3 py-1 text-sm font-bold">
          od {TRADE_INFO[trade].rate} Kč/h
        </span>
      </span>
      <span className="mt-4 text-lg font-extrabold">{TRADE_INFO[trade].name}</span>
      <span className="mt-1 text-[15px] opacity-90">{HERO_COPY[trade]}</span>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-secondary-foreground">
        Vybrat: {TRADE_INFO[trade].name}
        <ArrowRight className="h-4 w-4 text-primary-soft transition group-hover:translate-x-1" />
      </span>
    </button>
  );
}

function Index() {
  const av = useAvail();
  const [trade, setTrade] = useState<Trade>("voda");

  function pick(t: Trade) {
    setTrade(t);
    scrollToOrder();
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="hero-ambient hero-halo overflow-hidden text-secondary-foreground">
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.12fr_0.88fr] md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
              <span className={cn("h-2 w-2 rounded-full", av.open ? "animate-pulse bg-primary" : "bg-muted-foreground")} />
              {av.open ? `Síť v ČR v pohotovosti • právě ${av.count} ${plural(av.count)}` : "Dispečink právě ověřuje volné mistry"}
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.12] md:leading-[1.05] md:text-6xl">
              Řemeslník nebo hodinový manžel u vás, <span className="text-primary">když to hoří.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg opacity-80">
              Žádný stres. Popište závadu, dispečer obratem osloví nejbližšího prověřeného mistra a vy platíte až po hotové práci.
            </p>
          </div>

          <div className="self-center rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/5 p-6 md:p-8">
            <div className="flex items-center gap-3 text-sm uppercase tracking-widest opacity-70"><Clock className="h-4 w-4" /> Dostupnost sítě v ČR</div>
            {av.open ? (
              <>
                <div className="mt-3 text-4xl font-black text-primary">Dle vaší lokality</div>
                <p className="mt-3 opacity-80 md:hidden">Pošlete poptávku a dispečink vám zavolá s reálným časem.</p>
                <p className="mt-3 hidden opacity-80 md:block">Počet volných mistrů je za celou síť, nikoli pro vaši obec. Čas příjezdu potvrdí řemeslník při přijetí zakázky.</p>
              </>
            ) : (
              <>
                <div className="mt-3 text-4xl font-black">Na dotaz</div>
                <p className="mt-3 opacity-80">Teď nemáme potvrzeného volného mistra. Pošlete poptávku a dispečink vám zavolá s reálným časem.</p>
              </>
            )}
            <p className="mt-2 text-xs opacity-60">Aktualizováno {av.updated.getTime() > 0 ? av.updated.toLocaleString("cs-CZ") : "—"}</p>
            <div className={cn("mt-6 grid gap-3 text-center text-sm", av.open ? "grid-cols-3" : "grid-cols-2")}>
              {av.open && <div><div className="text-2xl font-black">{av.count}</div><div className="opacity-70">volných mistrů</div></div>}
              <div><div className="text-2xl font-black">{CALLOUT_FEE} Kč</div><div className="opacity-70">výjezd</div></div>
              <div><div className="text-2xl font-black">0 Kč</div><div className="opacity-70">předem</div></div>
            </div>
            <Link to="/cenik" className="mt-6 inline-block rounded-md border border-secondary-foreground/30 px-4 py-2 text-sm font-bold hover:bg-secondary-foreground/10">Zobrazit ceník</Link>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20">
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-70">S čím vám pomůžeme – klepněte a objednejte</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {HERO_TRADES.map((t) => <TradeCard key={t} trade={t} selected={trade === t} onPick={pick} />)}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary-foreground/25 bg-secondary-foreground/10 px-4 py-2 text-sm font-semibold">
              <Wallet className="h-4 w-4 text-primary" /> Výjezd {CALLOUT_FEE} Kč s diagnostikou
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary-foreground/25 bg-secondary-foreground/10 px-4 py-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Řemeslníci ověření a pojištění
            </span>
          </div>
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 text-center text-sm opacity-80">
            <Zap className="h-4 w-4 shrink-0 text-primary" />
            <span>Také elektro – výpadek proudu, jistič, zásuvky, světla. Objednáte ve formuláři níže.</span>
          </p>
        </div>
      </section>

      <section className="bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-black md:text-4xl">Jak to funguje</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              [PhoneCall, "Zadáte požadavek", "Vyplníte krátký formulář nebo pošlete fotku závady. Trvá to minutu."],
              [Truck, "Dispečink spojí mistra", "Obratem oslovíme nejbližšího volného řemeslníka a potvrdíme vám čas."],
              [Wallet, "Mistr dorazí", "Mistr závadu opraví. Platíte až po hotové práci, kartou nebo hotově."],
            ].map(([Icon, t, d], i) => {
              const I = Icon as typeof PhoneCall;
              return (
                <div key={i} className="relative">
                  <div className="font-display text-6xl font-black text-primary/25">0{i + 1}</div>
                  <I className="mt-2 h-7 w-7 text-primary" />
                  <h3 className="mt-3 text-xl font-extrabold">{t as string}</h3>
                  <p className="mt-2 text-muted-foreground">{d as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="objednat" className="mx-auto grid max-w-6xl scroll-mt-24 gap-10 px-4 py-20 md:grid-cols-5">
        <div className="md:col-span-2">
          <h2 className="text-3xl font-black md:text-4xl">Expresní objednávka</h2>
          <p className="mt-4 text-muted-foreground">Čím víc nám řeknete, tím rychleji pošleme správného mistra se správným nářadím.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Dojezd potvrzený po přijetí zakázky", `Pevný výjezd ${CALLOUT_FEE} Kč včetně diagnostiky`, "Ověření a pojištění řemeslníci"].map((x) => (
              <li key={x} className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-success" /> {x}</li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3"><RequestForm trade={trade} onTradeChange={setTrade} /></div>
      </section>
      <SiteFooter />
    </div>
  );
}

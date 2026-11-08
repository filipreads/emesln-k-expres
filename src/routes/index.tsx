import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Droplets, KeyRound, Hammer, Zap, ShieldCheck, PhoneCall, Truck, Wallet } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { RequestForm } from "@/components/RequestForm";
import { TRADE_INFO, CALLOUT_FEE, type Trade } from "@/lib/content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fofr Mistr – řemeslník u vás do 60–90 minut | Praha" },
      { name: "description", content: "Havárie vody, elektřiny, zabouchnuté dveře i drobné opravy. Expresní řemeslník v Praze do 60–90 minut, platíte po práci." },
      { property: "og:title", content: "Fofr Mistr – řemeslník do 60–90 minut" },
      { property: "og:description", content: "Expresní instalatér, elektrikář, zámečník a hodinový manžel po celé Praze." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ICONS: Record<Trade, typeof Droplets> = { voda: Droplets, elektro: Zap, zamecnik: KeyRound, manzel: Hammer };

function Countdown() {
  const [s, setS] = useState(60 * 60);
  useEffect(() => {
    const t = setInterval(() => setS((v) => (v > 0 ? v - 1 : 3600)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return <span className="font-display tabular-nums">{mm}:{ss}</span>;
}

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="bg-secondary text-secondary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> 14 mistrů právě volných v Praze
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] md:text-6xl">
              Řemeslník nebo hodinový manžel <span className="text-primary">u vás do 60–90 minut</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg opacity-80">
              Teče voda, vypadl proud nebo jste se zabouchli? Napište nám a dispečink obratem pošle nejbližšího volného mistra.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#objednat" className="rounded-md bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90">Objednat mistra</a>
              <Link to="/cenik" className="rounded-md border border-secondary-foreground/30 px-6 py-3 font-bold hover:bg-secondary-foreground/10">Ceník</Link>
            </div>
          </div>
          <div className="self-center rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/5 p-8">
            <div className="flex items-center gap-3 text-sm uppercase tracking-widest opacity-70"><Clock className="h-4 w-4" /> Garance dostupnosti</div>
            <div className="mt-3 text-7xl font-black text-primary"><Countdown /></div>
            <p className="mt-3 opacity-80">Objednejte teď a mistr může být u vás do konce odpočtu. Celá Praha 1–22, 7 dní v týdnu.</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
              <div><div className="text-2xl font-black">~52 min</div><div className="opacity-70">průměrný dojezd</div></div>
              <div><div className="text-2xl font-black">{CALLOUT_FEE} Kč</div><div className="opacity-70">výjezd</div></div>
              <div><div className="text-2xl font-black">0 Kč</div><div className="opacity-70">předem</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-black md:text-4xl">Co vyřešíme</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(TRADE_INFO) as Trade[]).map((t) => {
            const Icon = ICONS[t];
            return (
              <div key={t} className="rounded-xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary">
                <Icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-xl font-extrabold">{TRADE_INFO[t].name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{TRADE_INFO[t].desc}</p>
                <p className="mt-4 text-sm font-semibold">od {TRADE_INFO[t].rate} Kč/h</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-black md:text-4xl">Jak to funguje</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              [PhoneCall, "Zadáte požadavek", "Vyplníte krátký formulář nebo pošlete fotku závady. Trvá to minutu."],
              [Truck, "Dispečink spojí mistra", "Obratem oslovíme nejbližšího volného řemeslníka a potvrdíme vám čas."],
              [Wallet, "Do hodiny je u vás", "Mistr závadu opraví. Platíte až po hotové práci, kartou nebo hotově."],
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

      <section id="objednat" className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-5">
        <div className="md:col-span-2">
          <h2 className="text-3xl font-black md:text-4xl">Expresní objednávka</h2>
          <p className="mt-4 text-muted-foreground">Čím víc nám řeknete, tím rychleji pošleme správného mistra se správným nářadím.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Potvrzení telefonem do 5 minut", `Pevný výjezd ${CALLOUT_FEE} Kč včetně diagnostiky`, "Ověření a pojištění řemeslníci"].map((x) => (
              <li key={x} className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-success" /> {x}</li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3"><RequestForm /></div>
      </section>
      <SiteFooter />
    </div>
  );
}

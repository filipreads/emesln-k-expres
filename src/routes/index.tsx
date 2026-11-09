import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Droplets, KeyRound, Hammer, Zap, ShieldCheck, PhoneCall, Truck, Wallet } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { RequestForm } from "@/components/RequestForm";
import { getAvailability } from "@/lib/api.functions";
import { TRADE_INFO, CALLOUT_FEE, type Trade } from "@/lib/content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fofr Mistr – expresní řemeslník v Praze" },
      { name: "description", content: "Havárie vody, elektřiny, zabouchnuté dveře i drobné opravy. Expresní řemeslník v Praze s aktuálním odhadem dojezdu, platíte po práci." },
      { property: "og:title", content: "Fofr Mistr – expresní řemeslník v Praze" },
      { property: "og:description", content: "Expresní instalatér, elektrikář, zámečník a hodinový manžel po celé Praze." },
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

function Index() {
  const av = useAvail();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="bg-secondary text-secondary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
              <span className={av.open ? "h-2 w-2 animate-pulse rounded-full bg-primary" : "h-2 w-2 rounded-full bg-muted-foreground"} />
              {av.open ? `${av.count} ${plural(av.count)} právě teď v Praze` : "Momentálně ověřujeme volné mistry"}
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] md:text-6xl">
              Řemeslník nebo hodinový manžel <span className="text-primary">rychle u vás</span>
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
            <div className="flex items-center gap-3 text-sm uppercase tracking-widest opacity-70"><Clock className="h-4 w-4" /> Aktuální dostupnost</div>
            {av.open ? (
              <>
                <div className="mt-3 text-6xl font-black text-primary">~{av.eta} min</div>
                <p className="mt-3 opacity-80">Odhad dojezdu podle aktuálně volných mistrů. Přesný čas vám potvrdí dispečink telefonem.</p>
              </>
            ) : (
              <>
                <div className="mt-3 text-4xl font-black">Na dotaz</div>
                <p className="mt-3 opacity-80">Teď nemáme potvrzeného volného mistra. Pošlete poptávku a dispečink vám zavolá s reálným časem.</p>
              </>
            )}
            <p className="mt-2 text-xs opacity-60">Aktualizováno {av.updated.getTime() > 0 ? av.updated.toLocaleString("cs-CZ") : "—"}</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
              <div><div className="text-2xl font-black">{av.open ? av.count : 0}</div><div className="opacity-70">volných mistrů</div></div>
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

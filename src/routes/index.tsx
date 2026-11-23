import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Droplets, KeyRound, Hammer, Zap, ShieldCheck, Mail, Truck, Wallet, ArrowRight, Wrench, BadgeCheck, Receipt, Clock, CheckCircle2, MessageCircleQuestion, Quote } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { OrderWizard, type Preset } from "@/components/OrderWizard";
import { MobileBar, ContactDialog } from "@/components/MobileActions";
import { getAvailability } from "@/lib/api.functions";
import { publicReviews } from "@/lib/workflow.functions";
import { Stars } from "@/components/RatingForm";
import { Card, CardContent } from "@/components/ui/card";
import { TRADE_INFO, SERVICE_ORDER, QUICK_ISSUES, CALLOUT_FEE, FAQ, type Trade } from "@/lib/content";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { availableCount } from "@/lib/availability";

const TITLE = "Fofr Mistr – expresní instalatér, zámečník, elektrikář po celé ČR";
const DESC = "Havárie vody, zabouchnuté dveře, vypadlý jistič i drobné opravy. Výjezd 690 Kč s diagnostikou, 0 Kč předem, platíte až po hotové práci.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "cs_CZ" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", name: "Fofr Mistr",
        url: "https://fofrmistr.lovable.app", areaServed: { "@type": "Country", name: "Česká republika" },
        priceRange: `od ${CALLOUT_FEE} Kč`, description: DESC,
        makesOffer: SERVICE_ORDER.map((t) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: TRADE_INFO[t].name }, priceSpecification: { "@type": "UnitPriceSpecification", price: TRADE_INFO[t].rate, priceCurrency: "CZK", unitText: "hodina" } })),
      }) },
      { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      }) },
    ],
  }),
  loader: async () => { const [av, rv] = await Promise.all([getAvailability(), publicReviews().catch(() => ({ reviews: [], count: 0, average: null }))]); return { ...av, rv, checkedAt: Date.now() }; },
  component: Index,
});

const ICONS: Record<Trade, typeof Droplets> = { voda: Droplets, elektro: Zap, zamecnik: KeyRound, manzel: Hammer };

function scrollToOrder() {
  const el = document.getElementById("objednat");
  if (!el) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
}

function ServiceCard({ trade, onPick }: { trade: Trade; onPick: (t: Trade, issue?: string) => void }) {
  const Icon = ICONS[trade];
  return (
    <div className="group flex flex-col rounded-2xl border border-secondary-foreground/25 bg-secondary-foreground/10 p-5 transition duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-hero">
      <button type="button" onClick={() => onPick(trade)} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
        <span className="flex items-start justify-between gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon className="h-6 w-6" strokeWidth={2.25} /></span>
          <span className="rounded-full border border-secondary-foreground/25 bg-secondary-foreground/10 px-3 py-1 text-sm font-bold">od {TRADE_INFO[trade].rate} Kč/h</span>
        </span>
        <span className="mt-4 block text-lg font-extrabold">{TRADE_INFO[trade].name}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-primary-soft">Objednat <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
      </button>
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_ISSUES[trade].map((q) => (
          <button key={q} type="button" onClick={() => onPick(trade, q)}
            className="min-h-10 rounded-full border border-secondary-foreground/30 px-3 text-sm font-semibold hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { time: "00:01", Icon: Mail, title: "Zadáte požadavek", text: "Tři krátké kroky a váš e-mail. Stačí minuta." },
  { time: "00:05", Icon: Truck, title: "Dispečink spojí mistra", text: "Oslovíme nejbližšího ověřeného mistra ve vašem kraji a potvrdíme čas." },
  { time: "~00:40", Icon: Wrench, title: "Mistr je u vás", text: "Řekne odhad ceny, opraví a platíte až po hotové práci." },
];
const PREVIEW = [
  { label: "Nová poptávka", note: "Prasklá trubka · Brno" },
  { label: "Mistr přijal zakázku", note: "Pavel N. · voda a odpady" },
  { label: "Na cestě · dorazí za ~35 min", note: "Hotovo, zaplaceno kartou" },
];

function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset["i"])); }), { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  return (
    <section id="jak" className="scroll-mt-20 bg-muted">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-black md:text-4xl">Jak to funguje</h2>
          <ol className="relative mt-10 space-y-16 border-l-2 border-border pl-8 md:space-y-40 md:pb-24">
            {STEPS.map((s, i) => (
              <li key={s.time} data-i={i} ref={(el) => { refs.current[i] = el; }} className={cn("relative transition-opacity duration-300", active === i ? "opacity-100" : "md:opacity-50")}>
                <span className={cn("absolute -left-11 grid h-6 w-6 place-items-center rounded-full border-2 transition", active >= i ? "border-primary bg-primary" : "border-border bg-background")} />
                <div className="font-display text-sm font-black tracking-widest text-primary">{s.time}</div>
                <s.Icon className="mt-2 h-7 w-7 text-primary" />
                <h3 className="mt-2 text-xl font-extrabold">{s.title}</h3>
                <p className="mt-1 text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="hidden md:block">
          <div className="sticky top-28 rounded-2xl border border-border bg-card p-6 shadow-hero" aria-hidden>
            <div className="flex items-center justify-between text-sm"><span className="font-bold">Zakázka FM-7A31C2</span><span className="rounded-full bg-accent px-3 py-1 font-semibold text-accent-foreground">Ukázka</span></div>
            <ul className="mt-6 space-y-4">
              {PREVIEW.map((p, i) => (
                <li key={p.label} className={cn("flex items-start gap-3 rounded-xl p-3 transition duration-500", i <= active ? "bg-accent opacity-100" : "opacity-40")}>
                  <CheckCircle2 className={cn("mt-0.5 h-5 w-5 shrink-0", i <= active ? "text-success" : "text-muted-foreground")} />
                  <div><div className="font-bold">{p.label}</div><div className="text-sm text-muted-foreground">{p.note}</div></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Index() {
  const a = Route.useLoaderData();
  const [now, setNow] = useState(a.checkedAt);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [a.checkedAt]);
  const count = availableCount(a, now);
  const [preset, setPreset] = useState<Preset | undefined>();
  const [cb, setCb] = useState(false);

  function pick(t: Trade, issue?: string) {
    setPreset({ trade: t, issue, nonce: Date.now() });
    scrollToOrder();
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <SiteHeader />
      <section className="hero-ambient hero-halo overflow-hidden text-secondary-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 md:pt-20">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-secondary-foreground/10 px-4 py-2 text-sm font-semibold" role="status">
            <span className="relative flex h-2.5 w-2.5 shrink-0"><span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", count > 0 ? "bg-success" : "bg-primary")} /><span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", count > 0 ? "bg-success" : "bg-primary")} /></span>
            {count > 0
              ? <span>Online: {count} volných mistrů • Průměrný dojezd ~{a.eta_minutes} min</span>
              : <span>Dostupnost na dotaz • Dispečink ověří volného mistra a potvrdí dojezd</span>}
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.1] md:text-6xl md:leading-[1.05]">
            Řemeslník nebo hodinový manžel u vás, <span className="text-primary">když to hoří.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg opacity-85">Klid, postaráme se o to. Popište závadu, dispečer obratem osloví nejbližšího prověřeného mistra a vy platíte až po hotové práci.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-14 px-8 text-base font-bold" onClick={scrollToOrder}>Objednat mistra <ArrowRight className="h-5 w-5" /></Button>
            <Button size="lg" variant="outline" className="h-14 border-secondary-foreground/40 bg-transparent px-8 text-base font-bold text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground" onClick={() => setCb(true)}><Mail className="h-5 w-5" /> Napsat dispečinku</Button>
          </div>

          <h2 id="sluzby" className="mt-16 scroll-mt-24 text-sm font-bold uppercase tracking-widest opacity-75">S čím vám pomůžeme – klepněte na kartu nebo závadu</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_ORDER.map((t) => <ServiceCard key={t} trade={t} onPick={pick} />)}
          </div>
        </div>
      </section>

      <HowItWorks />

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-black md:text-4xl">Férová cena bez překvapení</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <div className="rounded-2xl bg-secondary p-8 text-secondary-foreground md:row-span-2">
            <Wallet className="h-8 w-8 text-primary" />
            <div className="mt-6 font-display text-6xl font-black">{CALLOUT_FEE} Kč</div>
            <p className="mt-2 text-lg font-bold">Pevný výjezd včetně diagnostiky</p>
            <p className="mt-2 opacity-80">Doprava i zjištění příčiny za jednu cenu, kdekoli v ČR.</p>
          </div>
          {[
            [Receipt, "Odhad ceny před opravou", "Mistr začne až po vašem souhlasu s odhadem."],
            [BadgeCheck, "0 Kč předem", "Platíte až po hotové práci, kartou nebo hotově."],
            [ShieldCheck, "Pojištění řemeslníci", "Každý mistr v síti je ověřený a pojištěný."],
            [Clock, "Hodinové sazby od 590 Kč", "Přehledně podle oboru v ceníku."],
          ].map(([I, t, d]) => { const Icon = I as typeof Wallet; return (
            <div key={t as string} className="rounded-2xl border border-border bg-card p-6">
              <Icon className="h-6 w-6 text-primary" /><h3 className="mt-3 text-lg font-extrabold">{t as string}</h3><p className="mt-1 text-muted-foreground">{d as string}</p>
            </div>); })}
        </div>
      </section>

      <section id="objednat" className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 py-20 md:grid-cols-5">
        <div className="md:col-span-2">
          <h2 className="text-3xl font-black md:text-4xl">Expresní objednávka</h2>
          <p className="mt-4 text-muted-foreground">Tři krátké kroky. Rozpracovanou objednávku si pamatujeme, i když stránku zavřete.</p>
          <ul className="mt-6 space-y-3">
            {["Dojezd potvrzený po přijetí zakázky", `Pevný výjezd ${CALLOUT_FEE} Kč včetně diagnostiky`, "Ověření a pojištění řemeslníci"].map((x) => (
              <li key={x} className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-success" /> {x}</li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3"><OrderWizard preset={preset} /></div>
      </section>

      <section id="dotazy" className="scroll-mt-20 bg-muted">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Quote className="h-4 w-4" />Řekli o nás</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Hodnocení od zákazníků</h2>
            {a.rv.count > 0 && a.rv.average != null ? (
              <div className="mt-4 flex items-center gap-3"><Stars value={a.rv.average} /><span className="font-bold">{a.rv.average.toLocaleString("cs-CZ")} / 5</span><span className="text-muted-foreground">· {a.rv.count} hodnocení</span></div>
            ) : null}
            <div className="mt-6 space-y-4">
              {a.rv.reviews.length ? a.rv.reviews.map((r, i) => (
                <Card key={i}><CardContent className="pt-6"><Stars value={r.stars} size="h-4 w-4" /><p className="mt-3 text-base">„{r.comment}"</p><p className="mt-3 text-sm font-semibold text-muted-foreground">{r.author_name}</p></CardContent></Card>
              )) : (
                <Card><CardContent className="pt-6"><p className="text-base">Hodnocení sbíráme od skutečných zákazníků po každé dokončené zakázce. Zobrazíme je tady, jakmile je budeme mít – nic si nevymýšlíme.</p></CardContent></Card>
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Hodnotí se oboustranně: zákazník hodnotí mistra a mistr zákazníka. Díky tomu k vám jezdí ti nejlepší.</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary"><MessageCircleQuestion className="h-4 w-4" />Časté dotazy</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Na co se ptáte</h2>
            <Accordion type="single" collapsible className="mt-6 rounded-xl border border-border bg-card px-5">
              {FAQ.map(([q, ans]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-base font-bold">{q}</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">{ans}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="hero-ambient overflow-hidden text-secondary-foreground">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center">
          <h2 className="text-3xl font-black md:text-5xl">Něco teče, cvaklo nebo zaklaplo?</h2>
          <p className="max-w-xl text-lg opacity-90">Objednávka zabere dvě minuty. Výjezd {CALLOUT_FEE} Kč s diagnostikou, cenu opravy znáte předem.</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button size="lg" onClick={scrollToOrder}>Objednat mistra <ArrowRight className="h-4 w-4" /></Button>
            <Button size="lg" variant="secondary" onClick={() => setCb(true)}><Mail className="h-4 w-4" />Napsat dispečinku</Button>
          </div>
        </div>
      </section>

      <SiteFooter />
      <MobileBar onOrder={scrollToOrder} />
      <ContactDialog open={cb} onOpenChange={setCb} />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TRADE_INFO, CALLOUT_FEE, type Trade } from "@/lib/content";

export const Route = createFileRoute("/cenik")({
  head: () => ({
    meta: [
      { title: "Ceník – Fofr Mistr ČR" },
      { name: "description", content: "Pevný výjezdní poplatek a transparentní hodinové sazby pro instalatéra, elektrikáře, zámečníka a hodinového manžela." },
      { property: "og:title", content: "Ceník – Fofr Mistr" },
      { property: "og:description", content: "Pevný výjezd a jasné hodinové sazby bez skrytých poplatků." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-black md:text-5xl">Transparentní ceník</h1>
        <p className="mt-3 text-muted-foreground">Žádné skryté poplatky. Cenu vám mistr potvrdí před zahájením práce.</p>
        <div className="mt-10 rounded-2xl bg-secondary p-8 text-secondary-foreground">
          <div className="text-sm uppercase tracking-widest opacity-70">Startovní výjezdní poplatek</div>
          <div className="mt-2 text-5xl font-black text-primary">{CALLOUT_FEE} Kč</div>
          <p className="mt-2 opacity-80">Výjezd a diagnostika závady. Dostupnost a případné náklady delší dopravy vám potvrdíme před objednáním. Zahrnuje prvních 15 minut práce.</p>
        </div>
        <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
          {(Object.keys(TRADE_INFO) as Trade[]).map((t) => (
            <div key={t} className="flex items-center justify-between p-6">
              <div>
                <div className="text-lg font-extrabold">{TRADE_INFO[t].name}</div>
                <div className="text-sm text-muted-foreground">{TRADE_INFO[t].desc}</div>
              </div>
              <div className="text-right"><span className="text-2xl font-black">{TRADE_INFO[t].rate} Kč</span><span className="text-sm text-muted-foreground"> / hod</span></div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Účtuje se po započatých 15 minutách. Materiál dle skutečné spotřeby. Ceny včetně DPH.</p>
      </main>
      <SiteFooter />
    </div>
  );
}

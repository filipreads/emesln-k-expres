import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Award, Clock3, Lock, MapPin, RefreshCw, Trophy } from "lucide-react";
import { getMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, TRADE_INFO, type Trade } from "@/lib/content";
import type { computeGame } from "@/lib/gamification";

const accountQuery = queryOptions({ queryKey: ["my-account"], queryFn: () => getMyAccount(), refetchInterval: 15000 });
const formatDate = (date: string) => new Date(date).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", dateStyle: "medium", timeStyle: "short" });

export const Route = createFileRoute("/_authenticated/ucet")({
  head: () => ({
    meta: [
      { title: "Můj účet – Fofr Mistr" },
      { name: "description", content: "Přehled vašich objednávek, aktuální stav, adresy a podrobnosti zakázek, body a odznaky." },
      { property: "og:title", content: "Můj účet – Fofr Mistr" },
      { property: "og:description", content: "Vaše objednávky, aktuální stav, adresy a podrobnosti zakázek." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountQuery),
  component: Account,
});

function Game({ title, g }: { title: string; g: ReturnType<typeof computeGame> }) {
  const pct = Math.round(((g.points % 300) / 300) * 100);
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><span className="flex items-center gap-1 font-bold text-primary"><Trophy className="h-5 w-5" /> Úroveň {g.level}</span></div>
      <p className="mt-1 text-sm text-muted-foreground">{g.points} bodů · další úroveň při {g.nextLevelAt}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {g.achievements.map((a) => (
          <div key={a.id} className={`flex gap-3 rounded-lg border p-3 ${a.earned ? "border-primary bg-accent" : "border-border opacity-60"}`}>
            {a.earned ? <Award className="h-6 w-6 shrink-0 text-primary" /> : <Lock className="h-6 w-6 shrink-0 text-muted-foreground" />}
            <div><div className="font-semibold">{a.name}</div><div className="text-xs text-muted-foreground">{a.description}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Account() {
  const { data, refetch, isFetching, isRefetchError } = useSuspenseQuery(accountQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-black">Ahoj{data.name ? `, ${data.name}` : ""}</h1>
          <Button variant="outline" onClick={signOut}>Odhlásit</Button>
        </div>
        <section aria-labelledby="orders-heading" className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="orders-heading" className="text-xl font-bold">Moje objednávky <span className="text-muted-foreground">({data.orders.length})</span></h2>
            <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={`h-4 w-4 ${isFetching ? "motion-safe:animate-spin" : ""}`} />Obnovit</Button>
          </div>
          {isRefetchError && <p role="alert" className="mt-3 text-sm text-destructive">Stav se nepodařilo aktualizovat. Zobrazené údaje mohou být starší.</p>}
          {data.orders.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Zatím žádné objednávky. <a href="/#objednat" className="text-primary underline">Objednat mistra</a></p> : (
            <ul className="mt-5 space-y-4">
              {data.orders.map((o) => (
                <li key={o.id}>
                  <article className="min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h3 className="text-lg font-bold">{TRADE_INFO[o.trade as Trade]?.name ?? o.trade}</h3><p className="mt-1 text-xs text-muted-foreground">Objednáno {formatDate(o.created_at)}</p></div>
                      <span className={`max-w-full break-words rounded-md px-3 py-1 text-sm font-semibold ${o.status === "dokonceno" ? "bg-muted text-success" : "bg-accent text-accent-foreground"}`}>{STATUS_LABEL[o.status]}</span>
                    </div>
                    <p className="mt-4 flex items-start gap-2 text-sm"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 break-words">{o.address}<br />{[o.postal_code, o.city || o.district].filter(Boolean).join(" ")}{o.region && <span className="block text-muted-foreground">{o.region}</span>}</span></p>
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm">{o.description}</p>
                    <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                      <div><dt className="text-muted-foreground">Naléhavost</dt><dd className={o.urgency === "havarie" ? "font-semibold text-destructive" : "font-semibold"}>{o.urgency === "havarie" ? "Havárie – ihned" : "Drobná oprava – dnes"}</dd></div>
                      <div><dt className="text-muted-foreground">Kontaktní telefon</dt><dd className="font-semibold">{o.phone}</dd></div>
                      {o.arrival_minutes != null && o.status !== "dokonceno" && <div className="sm:col-span-2"><dt className="flex items-center gap-1 text-muted-foreground"><Clock3 className="h-4 w-4" />Odhad dojezdu při přijetí</dt><dd className="font-semibold">{o.arrival_minutes} minut</dd></div>}
                    </dl>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">Poslední změna: {formatDate(o.updated_at)}</p>
                      <Button asChild variant="outline" size="sm"><Link to="/objednavka" search={{ token: o.tracking_token }}>Sledovat objednávku<ArrowUpRight className="h-4 w-4" /></Link></Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
        <Game title="Zákaznické odznaky" g={data.customerGame} />
        {data.craftsman ? (
          <>
            <Game title={`Řemeslník: ${data.craftsman.name}`} g={data.craftsman.game} />
            {data.craftsman.portal_token ? <Button asChild><Link to="/mistr" search={{ token: data.craftsman.portal_token }}>Otevřít portál řemeslníka</Link></Button>
              : <p className="text-sm text-muted-foreground">Vaše přihláška čeká na schválení dispečinkem.</p>}
          </>
        ) : <p className="text-sm text-muted-foreground">Jste řemeslník? <Link to="/pro-remeslniky" className="text-primary underline">Podejte přihlášku</Link> přihlášení a odznaky se vám začnou počítat.</p>}
      </main>
      <SiteFooter />
    </div>
  );
}

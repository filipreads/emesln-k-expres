import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Award, Lock, Trophy } from "lucide-react";
import { getMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { TRADE_INFO, type Trade } from "@/lib/content";
import type { computeGame } from "@/lib/gamification";

const STATUS: Record<string, string> = { nova: "Nová", oslovovani: "Oslovování", prijato: "Přijato", na_ceste: "Na cestě", dokonceno: "Dokončeno" };
const accountQuery = queryOptions({ queryKey: ["my-account"], queryFn: () => getMyAccount() });

export const Route = createFileRoute("/_authenticated/ucet")({
  head: () => ({
    meta: [
      { title: "Můj účet – Fofr Mistr" },
      { name: "description", content: "Vaše zakázky, body, úroveň a odznaky." },
      { property: "og:title", content: "Můj účet – Fofr Mistr" },
      { property: "og:description", content: "Vaše zakázky, body a odznaky." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const { data } = useSuspenseQuery(accountQuery);
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
        <Game title="Zákaznické odznaky" g={data.customerGame} />
        {data.craftsman ? (
          <>
            <Game title={`Řemeslník: ${data.craftsman.name}`} g={data.craftsman.game} />
            {data.craftsman.portal_token ? <Button asChild><Link to="/mistr" search={{ token: data.craftsman.portal_token }}>Otevřít portál řemeslníka</Link></Button>
              : <p className="text-sm text-muted-foreground">Vaše přihláška čeká na schválení dispečinkem.</p>}
          </>
        ) : <p className="text-sm text-muted-foreground">Jste řemeslník? <Link to="/pro-remeslniky" className="text-primary underline">Podejte přihlášku</Link> přihlášení a odznaky se vám začnou počítat.</p>}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Moje objednávky</h2>
          {data.orders.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Zatím žádné. <a href="/#objednat" className="text-primary underline">Objednat mistra</a></p> : (
            <ul className="mt-3 divide-y divide-border">
              {data.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                  <span>{TRADE_INFO[o.trade as Trade]?.name ?? o.trade} · {o.city} · {new Date(o.created_at).toLocaleDateString("cs-CZ")}</span>
                  <Link to="/objednavka" search={{ token: o.tracking_token }} className="font-semibold text-primary">{STATUS[o.status]}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

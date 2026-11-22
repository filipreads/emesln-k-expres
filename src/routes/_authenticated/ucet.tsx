import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Award, CheckCircle2, Clock3, Lock, MapPin, Receipt, RefreshCw, Star, Trophy, Wrench } from "lucide-react";
import { getMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_LABEL, TRADE_INFO, type Trade, urgencyLabel, formatPreferredTime } from "@/lib/content";
import { LEVEL_SIZE, type computeGame } from "@/lib/gamification";
import { cn } from "@/lib/utils";

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

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Receipt }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <CardTitle className="text-sm font-semibold text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-black">{value}</div>
      </CardContent>
    </Card>
  );
}

function Game({ title, g }: { title: string; g: ReturnType<typeof computeGame> }) {
  const earned = g.achievements.filter((a) => a.earned).length;
  const floor = (g.level - 1) * LEVEL_SIZE;
  const pct = Math.min(100, Math.max(0, Math.round(((g.points - floor) / LEVEL_SIZE) * 100)));
  const toNext = g.nextLevelAt - g.points;
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{g.points} bodů · {earned} z {g.achievements.length} odznaků</CardDescription>
        </div>
        <Badge className="shrink-0 gap-1"><Trophy className="h-3.5 w-3.5" aria-hidden="true" />Úroveň {g.level}</Badge>
      </CardHeader>
      <CardContent>
        <Progress value={pct} aria-label={`Postup do úrovně ${g.level + 1}`} />
        <p className="mt-2 text-sm text-muted-foreground">Do úrovně {g.level + 1} zbývá {toNext} bodů.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {g.achievements.map((a) => (
            <li key={a.id} className={cn("flex gap-3 rounded-lg border p-3", a.earned ? "border-primary/40 bg-accent" : "border-border bg-muted/50")}>
              {a.earned
                ? <Award className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                : <Lock className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <div className="min-w-0">
                <div className={cn("font-semibold", !a.earned && "text-muted-foreground")}>{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.description}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, text, action }: { icon: typeof Receipt; title: string; text: string; action: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 pt-10 pb-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-muted"><Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" /></span>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
        {action}
      </CardContent>
    </Card>
  );
}

function Account() {
  const { data, refetch, isFetching, isRefetchError } = useSuspenseQuery(accountQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const done = data.orders.filter((o) => o.status === "dokonceno").length;
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 break-words font-display text-2xl font-black sm:text-3xl">Ahoj{data.name ? `, ${data.name}` : ""}</h1>
          <Button variant="outline" onClick={signOut}>Odhlásit</Button>
        </div>

        <section aria-labelledby="overview-heading" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <h2 id="overview-heading" className="sr-only">Přehled</h2>
          <Stat label="Objednávek" value={data.orders.length} icon={Receipt} />
          <Stat label="Dokončeno" value={done} icon={CheckCircle2} />
          <Stat label="Body" value={data.customerGame.points} icon={Star} />
          <Stat label="Úroveň" value={data.customerGame.level} icon={Trophy} />
        </section>

        <Tabs defaultValue="customer">
          <TabsList aria-label="Přehled účtu" className="w-full max-w-sm">
            <TabsTrigger value="customer" className="flex-1">Zákazník</TabsTrigger>
            <TabsTrigger value="craftsman" className="flex-1">Řemeslník</TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-6 pt-4">
            <section aria-labelledby="orders-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="orders-heading" className="text-xl font-bold">Moje objednávky <span className="text-muted-foreground">({data.orders.length})</span></h2>
                <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={`h-4 w-4 ${isFetching ? "motion-safe:animate-spin" : ""}`} />Obnovit</Button>
              </div>
              {isRefetchError && <p role="alert" className="mt-3 text-sm text-destructive">Stav se nepodařilo aktualizovat. Zobrazené údaje mohou být starší.</p>}
              {data.orders.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon={Receipt}
                    title="Zatím žádné objednávky"
                    text="Popište závadu ve třech krocích a dispečink osloví nejbližšího volného mistra ve vašem kraji."
                    action={<Button asChild size="lg"><a href="/#objednat">Objednat mistra<ArrowUpRight className="h-4 w-4" /></a></Button>}
                  />
                </div>
              ) : (
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
                          <div><dt className="text-muted-foreground">Naléhavost</dt><dd className={o.urgency === "havarie" ? "font-semibold text-destructive" : "font-semibold"}>{urgencyLabel(o.urgency ?? "")}</dd></div>
                          {o.urgency === "planovano" && o.status !== "dokonceno" && <div><dt className="text-muted-foreground">Požadovaný termín</dt><dd className="font-semibold">{o.preferred_time ? <time dateTime={o.preferred_time}>{formatPreferredTime(o.preferred_time)}</time> : "Neuveden – ověřte s dispečinkem"}</dd></div>}
                          <div><dt className="text-muted-foreground">Kontaktní telefon</dt><dd className="font-semibold">{o.phone}</dd></div>
                          {o.arrival_minutes != null && o.urgency !== "planovano" && o.status !== "dokonceno" && <div className="sm:col-span-2"><dt className="flex items-center gap-1 text-muted-foreground"><Clock3 className="h-4 w-4" />Odhad dojezdu při přijetí</dt><dd className="font-semibold">{o.arrival_minutes} minut</dd></div>}
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
          </TabsContent>

          <TabsContent value="craftsman" className="space-y-6 pt-4">
            {data.craftsman ? (
              <>
                <Card>
                  <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="text-lg">Řemeslnická přihláška</CardTitle>
                      <CardDescription>{data.craftsman.name} · {TRADE_INFO[data.craftsman.trade as Trade]?.name ?? data.craftsman.trade}</CardDescription>
                    </div>
                    <Badge variant={data.craftsman.approved ? "default" : "secondary"} className="shrink-0">{data.craftsman.approved ? "Schváleno" : "Čeká na schválení"}</Badge>
                  </CardHeader>
                  <CardContent>
                    {data.craftsman.portal_token
                      ? <Button asChild><Link to="/mistr" search={{ token: data.craftsman.portal_token }}>Otevřít portál řemeslníka<ArrowUpRight className="h-4 w-4" /></Link></Button>
                      : <p className="text-sm text-muted-foreground">Jakmile dispečink přihlášku schválí, zpřístupníme vám portál s nabídkami zakázek.</p>}
                  </CardContent>
                </Card>
                <Game title="Řemeslnické odznaky" g={data.craftsman.game} />
              </>
            ) : (
              <EmptyState
                icon={Wrench}
                title="Zatím nejste v naší síti"
                text="Podejte přihlášku řemeslníka. Po schválení dispečinkem se vám zobrazí nabídky zakázek ve vašem kraji a začnou se počítat body a odznaky."
                action={<Button asChild size="lg"><Link to="/pro-remeslniky">Podejít přihlášku<ArrowUpRight className="h-4 w-4" /></Link></Button>}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}

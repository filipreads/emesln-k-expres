import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { submitApplication } from "@/lib/api.functions";
import { TRADE_INFO, type Trade } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/pro-remeslniky")({
  head: () => ({
    meta: [
      { title: "Přidejte se do sítě – Fofr Mistr pro řemeslníky" },
      { name: "description", content: "Jste instalatér, elektrikář, zámečník nebo hodinový manžel v Praze? Získejte zakázky bez shánění." },
      { property: "og:title", content: "Přidejte se do sítě Fofr Mistr" },
      { property: "og:description", content: "Zakázky v Praze přímo do telefonu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Join,
});

function Join() {
  const [trade, setTrade] = useState<Trade>("voda");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await submitApplication({ data: { name: String(f.get("name")), area: String(f.get("area")), phone: String(f.get("phone")), trade } });
      setDone(true);
    } catch {
      toast.error("Zkontrolujte prosím údaje (telefon ve formátu +420 777 123 456).");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-black md:text-5xl">Přidejte se do sítě</h1>
          <p className="mt-4 text-lg text-muted-foreground">Zakázky z vašeho okolí rovnou do telefonu. Vy si vyberete, kterou přijmete.</p>
          <ul className="mt-8 space-y-4">
            {["Žádné shánění zákazníků ani reklama", "Zakázky podle vaší lokality a oboru", "Výplata do 3 dnů od dokončení", "Pracujete, kdy chcete"].map((x) => (
              <li key={x} className="flex gap-3"><CheckCircle2 className="h-6 w-6 shrink-0 text-primary" /> {x}</li>
            ))}
          </ul>
        </div>
        {done ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-2xl font-extrabold">Díky za přihlášku!</h2>
            <p className="mt-2 text-muted-foreground">Ozveme se vám telefonicky a domluvíme další kroky.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div><Label htmlFor="name">Jméno a příjmení</Label><Input id="name" name="name" required maxLength={100} className="mt-1" /></div>
            <div>
              <Label>Obor</Label>
              <select value={trade} onChange={(e) => setTrade(e.target.value as Trade)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {(Object.keys(TRADE_INFO) as Trade[]).map((t) => <option key={t} value={t}>{TRADE_INFO[t].name}</option>)}
              </select>
            </div>
            <div><Label htmlFor="area">Lokalita působení</Label><Input id="area" name="area" required maxLength={200} placeholder="Např. Praha 4, 5, 10" className="mt-1" /></div>
            <div><Label htmlFor="phone">Telefon</Label><Input id="phone" name="phone" type="tel" required placeholder="+420 777 123 456" className="mt-1" /></div>
            <Button type="submit" size="lg" disabled={busy} className="w-full font-bold">{busy ? "Odesílám…" : "Odeslat přihlášku"}</Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Siren, Wrench } from "lucide-react";
import { submitRequest } from "@/lib/api.functions";
import { TRADE_INFO, type Trade } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { AddressFields } from "@/components/AddressFields";
import { Link } from "@tanstack/react-router";

export function RequestForm() {
  const [urgency, setUrgency] = useState<"havarie" | "dnes">("havarie");
  const [trade, setTrade] = useState<Trade>("voda");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("urgency", urgency);
    fd.set("trade", trade);
    setBusy(true);
    try {
      const result = await submitRequest({ data: fd });
      setToken(result.token);
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Odeslání selhalo, zkuste to znovu.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h3 className="mt-4 text-2xl font-extrabold">Požadavek přijat</h3>
        <p className="mt-2 text-muted-foreground">Hledáme vhodného řemeslníka ve vašem kraji. Dojezd platí až po přijetí zakázky řemeslníkem.</p>
        <Button asChild className="mt-6"><Link to="/objednavka" search={{ token }}>Sledovat objednávku</Link></Button>
        <Button variant="outline" className="mt-6 ml-2" onClick={() => setDone(false)}>Nový požadavek</Button>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        {([["havarie", "Havárie – ihned", Siren], ["dnes", "Drobná oprava dnes", Wrench]] as const).map(([v, l, Icon]) => (
          <Button variant="outline" type="button" key={v} onClick={() => setUrgency(v)}
            className={cn("h-auto whitespace-normal flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm font-semibold transition",
              urgency === v ? "border-primary bg-accent" : "border-border hover:border-primary/50")}>
            <Icon className="h-5 w-5 text-primary" /> {l}
          </Button>
        ))}
      </div>
      <div>
        <Label>Obor</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(Object.keys(TRADE_INFO) as Trade[]).map((t) => (
            <Button variant="outline" type="button" key={t} onClick={() => setTrade(t)}
              className={cn("h-auto whitespace-normal rounded-md border px-3 py-2 text-sm font-medium",
                trade === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50")}>
              {TRADE_INFO[t].name}
            </Button>
          ))}
        </div>
      </div>
      <AddressFields />
      <div>
        <Label htmlFor="description">Popis závady</Label>
        <Textarea id="description" name="description" required minLength={5} maxLength={2000} rows={3} placeholder="Např. teče voda pod dřezem, nejde zavřít ventil" className="mt-1" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="photo">Fotka (nepovinné)</Label>
          <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" type="tel" required placeholder="+420 777 123 456" className="mt-1" />
        </div>
      </div>
      <Button type="submit" size="lg" disabled={busy} className="w-full text-base font-bold">
        {busy ? "Odesílám…" : "Poslat mistra"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Dostupnost závisí na lokalitě. Platíte až po hotové práci.</p>
    </form>
  );
}

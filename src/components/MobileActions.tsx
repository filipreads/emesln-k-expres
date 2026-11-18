import { useState } from "react";
import { toast } from "sonner";
import { PhoneCall, Wrench } from "lucide-react";
import { submitCallback } from "@/lib/api.functions";
import { TRADE_INFO, SERVICE_ORDER, type Trade } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function CallbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [phone, setPhone] = useState("");
  const [trade, setTrade] = useState<Trade>("voda");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await submitCallback({ data: { phone, trade } });
      toast.success("Děkujeme, dispečink vám zavolá.");
      setPhone(""); onOpenChange(false);
    } catch { toast.error("Zkontrolujte telefon, např. 777 123 456."); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zavoláme vám do 5 minut</DialogTitle>
          <DialogDescription>Stačí telefon a obor. Vše ostatní domluvíte s dispečerem.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_ORDER.map((t) => (
            <Button key={t} type="button" variant="outline" aria-pressed={trade === t} onClick={() => setTrade(t)}
              className={cn("h-auto min-h-12 whitespace-normal font-semibold", trade === t ? "border-primary bg-primary text-primary-foreground" : "")}>{TRADE_INFO[t].name}</Button>
          ))}
        </div>
        <div><Label htmlFor="cb-phone">Telefon</Label>
          <Input id="cb-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+420 777 123 456" className="mt-1 h-12 text-base" /></div>
        <Button size="lg" className="w-full text-base font-bold" onClick={send} disabled={busy}>{busy ? "Odesílám…" : "Zavolejte mi"}</Button>
      </DialogContent>
    </Dialog>
  );
}

export function MobileBar({ onOrder }: { onOrder: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <Button size="lg" className="h-14 text-base font-bold" onClick={onOrder}><Wrench className="h-5 w-5" /> Objednat mistra</Button>
        <Button size="lg" variant="outline" className="h-14 whitespace-normal text-sm font-bold leading-tight" onClick={() => setOpen(true)}><PhoneCall className="h-5 w-5" /> Zavolejte mi do 5 min</Button>
      </div>
      <CallbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

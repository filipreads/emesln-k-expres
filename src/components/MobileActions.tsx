import { useState } from "react";
import { toast } from "sonner";
import { Mail, Wrench } from "lucide-react";
import { submitContact } from "@/lib/api.functions";
import { TRADE_INFO, SERVICE_ORDER, type Trade } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ContactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [trade, setTrade] = useState<Trade>("voda");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await submitContact({ data: { email, trade, message } });
      toast.success("Dotaz jsme uložili. Dispečink odpoví e-mailem.");
      setEmail(""); onOpenChange(false);
    } catch { toast.error("Zkontrolujte e-mail a napište zprávu."); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Napište dispečinku</DialogTitle>
          <DialogDescription>Napište nám, co potřebujete vyřešit. Odpověď dostanete e-mailem.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_ORDER.map((t) => (
            <Button key={t} type="button" variant="outline" aria-pressed={trade === t} onClick={() => setTrade(t)}
              className={cn("h-auto min-h-12 whitespace-normal font-semibold", trade === t ? "border-primary bg-primary text-primary-foreground" : "")}>{TRADE_INFO[t].name}</Button>
          ))}
        </div>
        <div><Label htmlFor="cb-email">E-mail</Label>
          <Input id="cb-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.cz" className="mt-1 h-12 text-base" /></div>
        <div><Label htmlFor="contact-message">Vaše zpráva</Label><Textarea id="contact-message" value={message} onChange={e => setMessage(e.target.value)} minLength={5} maxLength={2000} /></div>
        <Button size="lg" className="w-full" onClick={send} disabled={busy}>{busy ? "Odesílám…" : "Odeslat dotaz"}</Button>
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
        <Button size="lg" variant="outline" className="h-14 whitespace-normal text-sm font-bold leading-tight" onClick={() => setOpen(true)}><Mail className="h-5 w-5" /> Napsat dispečinku</Button>
      </div>
      <ContactDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

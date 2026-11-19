import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function Stars({ value, size = "h-5 w-5" }: { value: number; size?: string }) {
  return <span className="inline-flex gap-1" aria-label={`${value} z 5 hvězd`}>{[1,2,3,4,5].map(i => <Star key={i} className={cn(size, i <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground")} />)}</span>;
}

export function RatingForm({ title, allowPublic, onSubmit }: { title: string; allowPublic?: boolean; onSubmit: (v: { stars: number; comment?: string | undefined; public_ok: boolean }) => Promise<unknown> }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [pub, setPub] = useState(true);
  const [busy, setBusy] = useState(false);
  return <form className="space-y-4 rounded-xl border border-border bg-card p-5" onSubmit={async e => {
    e.preventDefault(); if (!stars) { toast.error("Vyberte počet hvězd"); return; }
    setBusy(true);
    try { await onSubmit({ stars, comment: comment.trim() || undefined, public_ok: !!allowPublic && pub }); toast.success("Děkujeme za hodnocení"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Uložení selhalo"); }
    finally { setBusy(false); }
  }}>
    <h3 className="text-lg font-bold">{title}</h3>
    <div role="radiogroup" aria-label="Počet hvězd" className="flex gap-2">{[1,2,3,4,5].map(i => <button key={i} type="button" role="radio" aria-checked={stars === i} aria-label={`${i} z 5`} onClick={() => setStars(i)} className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Star className={cn("h-9 w-9", i <= stars ? "fill-primary text-primary" : "text-muted-foreground")} /></button>)}</div>
    <Textarea value={comment} maxLength={500} onChange={e => setComment(e.target.value)} placeholder="Co se povedlo? (nepovinné)" />
    {allowPublic && <label className="flex items-center gap-3 text-sm"><Checkbox checked={pub} onCheckedChange={v => setPub(v === true)} />Můžete komentář zveřejnit na webu (jen křestní jméno a město)</label>}
    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy}>Odeslat hodnocení</Button>
  </form>;
}

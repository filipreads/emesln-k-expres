import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { manageRequest } from "@/lib/management.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Order = { id: string; status: string; trade: string; region: string | null; assigned_craftsman_id: string | null; cancelled_at: string | null; dispatcher_note: string | null };
type Craft = { id: string; name: string; approved: boolean; available: boolean; trade: string; region: string | null };
type Event = { request_id: string; actor: string; event: string; created_at: string };
export function DispatchOrderControls({ pin, order, craftsmen, events, onSaved }: { pin: string; order: Order; craftsmen: Craft[]; events: Event[]; onSaved: () => void }) {
  const manage = useServerFn(manageRequest);
  const [note, setNote] = useState(order.dispatcher_note ?? "");
  const [craftsman, setCraftsman] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (patch: { note?: string; craftsman?: string; cancel?: boolean }) => {
    setBusy(true);
    try { await manage({ data: { pin, id: order.id, ...patch } }); toast.success("Změna uložena"); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Uložení selhalo"); } finally { setBusy(false); }
  };
  return <div className="mt-4 space-y-4 border-t border-border pt-4">
    {!order.cancelled_at && <>
      <div><Label htmlFor={`note-${order.id}`}>Poznámka dispečinku</Label><Textarea id={`note-${order.id}`} value={note} onChange={e => setNote(e.target.value)} maxLength={2000} /><Button variant="outline" size="sm" disabled={busy} onClick={() => run({ note })}>Uložit poznámku</Button></div>
      {!order.assigned_craftsman_id && ["nova","oslovovani"].includes(order.status) && <div className="flex flex-wrap items-center gap-3"><label className="flex-1"><span className="text-sm">Přiřadit mistra</span><select aria-label="Přiřadit mistra" value={craftsman} onChange={e => setCraftsman(e.target.value)} className="w-full rounded-md border border-input bg-background p-2"><option value="">Vyberte dostupného mistra</option>{craftsmen.filter(c => c.approved && c.available && c.trade === order.trade && c.region === order.region).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><Button variant="outline" disabled={busy || !craftsman} onClick={() => run({ craftsman })}>Přiřadit</Button></div>}
      {order.status !== "dokonceno" && <Button variant="destructive" size="sm" disabled={busy} onClick={() => { if (window.confirm("Opravdu zrušit zakázku?")) run({ cancel: true }); }}>Zrušit zakázku</Button>}
    </>}
    <details><summary className="cursor-pointer text-sm font-semibold">Historie změn</summary><ul className="mt-3 space-y-2 text-sm">{events.filter(e => e.request_id === order.id).map((e,i) => <li key={i}>{new Date(e.created_at).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" })} · {e.actor} · {e.event}</li>)}{!events.some(e => e.request_id === order.id) && <li className="text-muted-foreground">Starší změny nejsou zaznamenané.</li>}</ul></details>
  </div>;
}

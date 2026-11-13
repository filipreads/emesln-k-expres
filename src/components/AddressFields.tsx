import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { suggestAddress, type AddressSuggestion } from "@/lib/address.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REGIONS, type Region } from "@/lib/regions";

function useSuggest(q: string, postcode: boolean, enabled: boolean) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  useEffect(() => {
    if (!enabled || q.trim().length < (postcode ? 3 : 3)) { setItems([]); return; }
    const t = setTimeout(() => { suggestAddress({ data: { q, postcode } }).then(setItems).catch(() => setItems([])); }, 300);
    return () => clearTimeout(t);
  }, [q, postcode, enabled]);
  return [items, setItems] as const;
}

function List({ items, onPick }: { items: AddressSuggestion[]; onPick: (s: AddressSuggestion) => void }) {
  if (!items.length) return null;
  return (
    <ul role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
      {items.map((s) => (
        <li key={s.label}>
          <button type="button" role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); onPick(s); }}
            className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{s.label}{s.region ? <span className="text-muted-foreground"> · {s.region}</span> : null}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AddressFields() {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [psc, setPsc] = useState("");
  const [region, setRegion] = useState<Region>("Praha");
  const [focus, setFocus] = useState<"a" | "p" | null>(null);
  const picked = useRef(false);
  const [aItems, setA] = useSuggest(city ? `${address} ${city}` : address, false, focus === "a" && !picked.current);
  const [pItems, setP] = useSuggest(psc.replace(/\s/g, "").replace(/^(\d{3})(\d+)/, "$1 $2"), true, focus === "p" && !picked.current);

  function pick(s: AddressSuggestion) {
    picked.current = true;
    if (s.street) setAddress(s.street);
    if (s.city) setCity(s.city);
    if (s.postal_code) setPsc(s.postal_code);
    if (s.region) setRegion(s.region);
    setA([]); setP([]); setFocus(null);
  }
  const typed = (fn: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { picked.current = false; fn(e.target.value); };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative">
          <Label htmlFor="postal_code">PSČ</Label>
          <Input id="postal_code" name="postal_code" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={psc} onChange={typed(setPsc)}
            onFocus={() => setFocus("p")} onBlur={() => setFocus(null)} placeholder="Např. 602 00" className="mt-1" />
          {focus === "p" && <List items={pItems} onPick={pick} />}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="district">Město / obec</Label>
          <Input id="district" name="district" required minLength={2} maxLength={100} value={city} onChange={typed(setCity)} placeholder="Např. Brno" className="mt-1" />
        </div>
      </div>
      <div className="relative">
        <Label htmlFor="address">Adresa</Label>
        <Input id="address" name="address" required maxLength={200} autoComplete="off" value={address} onChange={typed(setAddress)}
          onFocus={() => setFocus("a")} onBlur={() => setFocus(null)} placeholder="Začněte psát ulici a číslo popisné" className="mt-1" />
        {focus === "a" && <List items={aItems} onPick={pick} />}
      </div>
      <div><Label htmlFor="region">Kraj</Label>
        <select id="region" name="region" required value={region} onChange={(e) => setRegion(e.target.value as Region)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          {REGIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
    </div>
  );
}

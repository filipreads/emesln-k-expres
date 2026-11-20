import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, Siren, Wrench, CalendarClock, MapPin, LocateFixed, Camera, X, ArrowLeft, ArrowRight } from "lucide-react";
import { submitRequest } from "@/lib/api.functions";
import { suggestAddress, reverseAddress, type AddressSuggestion } from "@/lib/address.functions";
import { TRADE_INFO, SERVICE_ORDER, CALLOUT_FEE, URGENCY_LABEL, estimatePrice, type Trade, type Urgency } from "@/lib/content";
import { rememberOrder } from "@/lib/recent-orders";
import { REGIONS, type Region } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type Preset = { trade: Trade; issue?: string | undefined; nonce: number };

type Draft = {
  urgency: Urgency; when: string; trade: Trade; description: string;
  place: string; address: string; postal: string; city: string; region: Region;
  phone: string; name: string;
};
const EMPTY: Draft = { urgency: "havarie", when: "", trade: "voda", description: "", place: "", address: "", postal: "", city: "", region: "Praha", phone: "", name: "" };
const KEY = "fofr-draft-v1";
const STEPS = ["Závada", "Lokalita", "Kontakt"];

async function compress(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.8));
    return blob && blob.size < file.size ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}

function useSuggest(q: string, postcode: boolean, on: boolean) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  useEffect(() => {
    if (!on || q.trim().length < 3) { setItems([]); return; }
    const t = setTimeout(() => suggestAddress({ data: { q, postcode } }).then(setItems).catch(() => setItems([])), 300);
    return () => clearTimeout(t);
  }, [q, postcode, on]);
  return [items, setItems] as const;
}

function Suggestions({ items, onPick }: { items: AddressSuggestion[]; onPick: (s: AddressSuggestion) => void }) {
  if (!items.length) return null;
  return (
    <ul role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
      {items.map((s) => (
        <li key={s.label}>
          <button type="button" role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); onPick(s); }}
            className="flex min-h-12 w-full items-start gap-2 px-3 py-3 text-left text-base hover:bg-accent">
            <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" /><span>{s.label}{s.region ? <span className="text-muted-foreground"> · {s.region}</span> : null}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function OrderWizard({ preset }: { preset?: Preset | undefined }) {
  const [d, setD] = useState<Draft>(EMPTY);
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ token: string; id: string; snap: Draft } | null>(null);
  const [focus, setFocus] = useState<"place" | "addr" | null>(null);
  const [editRegion, setEditRegion] = useState(false);
  const [locating, setLocating] = useState(false);
  const loaded = useRef(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setD({ ...EMPTY, ...JSON.parse(s) }); } catch { /* ignore */ }
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) localStorage.setItem(KEY, JSON.stringify(d)); }, [d]);
  useEffect(() => {
    if (!preset) return;
    setD((p) => ({ ...p, trade: preset.trade, description: preset.issue ? (p.description.trim() ? p.description : preset.issue + ": ") : p.description }));
    setStep(0); setDone(null);
  }, [preset]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const isPostal = /^\d/.test(d.place.trim());
  const [placeItems, setPlaceItems] = useSuggest(isPostal ? d.place.replace(/\s/g, "").replace(/^(\d{3})(\d+)/, "$1 $2") : d.place, isPostal, focus === "place");
  const [addrItems, setAddrItems] = useSuggest(d.city ? `${d.address} ${d.city}` : d.address, false, focus === "addr");

  function apply(s: AddressSuggestion) {
    setD((p) => ({
      ...p,
      address: s.street || p.address,
      city: s.city || p.city,
      postal: s.postal_code || p.postal,
      region: s.region ?? p.region,
      place: [s.postal_code, s.city].filter(Boolean).join(" ") || p.place,
    }));
    setPlaceItems([]); setAddrItems([]); setFocus(null);
  }

  // Odvození kraje z PSČ na pozadí, i když uživatel nevybere návrh.
  useEffect(() => {
    const digits = d.place.replace(/\s/g, "");
    if (!/^\d{5}$/.test(digits)) return;
    suggestAddress({ data: { q: digits.replace(/^(\d{3})/, "$1 "), postcode: true } }).then((r) => {
      const hit = r[0];
      if (hit) setD((p) => ({ ...p, postal: digits, city: p.city || hit.city, region: hit.region ?? p.region }));
    }).catch(() => {});
  }, [d.place]);

  function locate() {
    if (!navigator.geolocation) { toast.error("Prohlížeč neumí zjistit polohu."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await reverseAddress({ data: { lat: pos.coords.latitude, lon: pos.coords.longitude } });
        if (r) { apply(r); toast.success("Adresu jsme doplnili, zkontrolujte číslo domu."); }
        else toast.error("Polohu se nepodařilo převést na adresu v ČR.");
      } catch { toast.error("Polohu se nepodařilo zjistit."); }
      setLocating(false);
    }, () => { setLocating(false); toast.error("Přístup k poloze nebyl povolen."); }, { timeout: 10000 });
  }

  async function pickPhoto(f: File | undefined) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { toast.error("Fotka musí být JPG, PNG nebo WebP."); return; }
    const c = await compress(f);
    setPhoto(c); setPreview(URL.createObjectURL(c));
  }

  const city = d.city || d.place.replace(/^\d{3}\s?\d{2}\s*/, "");
  const valid = [
    d.description.trim().length >= 5 && (d.urgency !== "planovano" || (!!d.when && new Date(d.when).getTime() > Date.now())),
    d.address.trim().length >= 3 && city.trim().length >= 2,
    /^(\+420)?\s?\d{3}\s?\d{3}\s?\d{3}$/.test(d.phone.trim()),
  ];
  const hints = [d.urgency === "planovano" && !(d.when && new Date(d.when).getTime() > Date.now()) ? "Vyberte budoucí termín návštěvy." : "Popište prosím závadu (aspoň pár slov).", "Doplňte město a adresu.", "Zadejte telefon ve tvaru 777 123 456."];

  function next() { if (!valid[step]) { toast.error(hints[step]); return; } setStep((s) => s + 1); }

  async function submit() {
    if (!valid.every(Boolean)) { toast.error(hints[valid.findIndex((v) => !v)]); return; }
    const fd = new FormData();
    fd.set("urgency", d.urgency); fd.set("trade", d.trade); fd.set("description", d.description.trim());
    fd.set("address", d.address); fd.set("district", city.trim()); fd.set("region", d.region);
    if (d.urgency === "planovano" && d.when) fd.set("preferred_time", new Date(d.when).toISOString());
    fd.set("phone", d.phone); fd.set("customer_name", d.name);
    if (/^\d{3}\s?\d{2}$/.test(d.postal.trim())) fd.set("postal_code", d.postal.trim());
    if (photo) fd.set("photo", photo);
    setBusy(true);
    try {
      const r = await submitRequest({ data: fd });
      rememberOrder({ token: r.token, id: r.id, trade: d.trade, at: new Date().toISOString() });
      setDone({ token: r.token, id: r.id, snap: { ...d, city } });
      localStorage.removeItem(KEY); setD(EMPTY); setStep(0); setPhoto(null); setPreview("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Odeslání selhalo, zkuste to znovu.");
    } finally { setBusy(false); }
  }

  if (done) {
    const s = done.snap;
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm md:p-8" role="status">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h3 className="mt-4 text-2xl font-extrabold">Máme to. Přebíráme vaši starost.</h3>
        <p className="mt-2 text-muted-foreground">Číslo zakázky</p>
        <p className="font-display text-3xl font-black tracking-wider text-primary">FM-{done.id.slice(0, 8).toUpperCase()}</p>
        <dl className="mx-auto mt-6 max-w-sm space-y-2 rounded-xl bg-muted p-4 text-left text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Obor</dt><dd className="font-semibold">{TRADE_INFO[s.trade].name}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Naléhavost</dt><dd className="font-semibold">{URGENCY_LABEL[s.urgency]}{s.urgency === "planovano" && s.when ? ` · ${new Date(s.when).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}` : ""}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Adresa</dt><dd className="text-right font-semibold">{s.address}, {s.city}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Telefon</dt><dd className="font-semibold">{s.phone}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">Dispečink teď hledá nejbližšího volného mistra. Čas příjezdu potvrdí řemeslník při přijetí.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild size="lg"><Link to="/objednavka" search={{ token: done.token }}>Sledovat objednávku</Link></Button>
          <Button size="lg" variant="outline" onClick={() => setDone(null)}>Nový požadavek</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-7">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>Krok {step + 1} ze 3 · {STEPS[step]}</span>
        <span className="text-muted-foreground">Rozpracované si pamatujeme</span>
      </div>
      <Progress value={((step + 1) / 3) * 100} className="mt-3" aria-label="Postup objednávky" />
      <ol className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        {STEPS.map((s, i) => <li key={s} className={i <= step ? "text-primary" : "text-muted-foreground"}>{i + 1}. {s}</li>)}
      </ol>

      <div className="mt-6 space-y-5">
        {step === 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {([["havarie", URGENCY_LABEL.havarie, Siren], ["dnes", URGENCY_LABEL.dnes, Wrench], ["planovano", URGENCY_LABEL.planovano, CalendarClock]] as const).map(([v, l, Icon]) => (
                <Button variant="outline" type="button" key={v} onClick={() => set("urgency", v)} aria-pressed={d.urgency === v}
                  className={cn("h-auto min-h-14 whitespace-normal justify-start gap-2 border-2 p-3 text-left text-base font-semibold",
                    d.urgency === v ? "border-primary bg-accent" : "border-border")}>
                  <Icon className="h-5 w-5 shrink-0 text-primary" /> {l}
                </Button>
              ))}
            </div>
            {d.urgency === "planovano" && (
              <div>
                <Label htmlFor="w-when">Kdy se vám to hodí?</Label>
                <Input id="w-when" type="datetime-local" value={d.when} onChange={(e) => set("when", e.target.value)} className="mt-1 h-12 text-base" />
                <p className="mt-1 text-sm text-muted-foreground">Termín vám dispečink potvrdí telefonem.</p>
              </div>
            )}
            <div className="rounded-xl bg-muted p-4 text-sm" aria-live="polite">
              <div className="font-semibold">Orientační cena za {TRADE_INFO[d.trade].name.toLowerCase()}</div>
              <div className="mt-1 text-lg font-bold">cca {estimatePrice(d.trade).low.toLocaleString("cs-CZ")} – {estimatePrice(d.trade).high.toLocaleString("cs-CZ")} Kč</div>
              <p className="mt-1 text-muted-foreground">Výjezd {CALLOUT_FEE} Kč s diagnostikou a 1–2 hodiny práce. Přesnou cenu řekne mistr před opravou.</p>
            </div>
            <div>
              <Label>Obor</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {SERVICE_ORDER.map((t) => (
                  <Button variant="outline" type="button" key={t} onClick={() => set("trade", t)} aria-pressed={d.trade === t}
                    className={cn("h-auto min-h-12 whitespace-normal text-base font-semibold",
                      d.trade === t ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    {TRADE_INFO[t].name}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="w-desc">Co se děje?</Label>
              <Textarea id="w-desc" value={d.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} rows={3}
                placeholder="Např. teče voda pod dřezem, nejde zavřít ventil" className="mt-1 text-base" />
            </div>
            <div>
              <Label>Fotka (nepovinné, pomůže mistrovi)</Label>
              {preview ? (
                <div className="relative mt-2 inline-block">
                  <img src={preview} alt="Náhled fotky závady" className="h-32 w-32 rounded-lg object-cover" />
                  <Button type="button" size="icon" variant="secondary" className="absolute -right-2 -top-2 rounded-full" aria-label="Odebrat fotku"
                    onClick={() => { setPhoto(null); setPreview(""); }}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <label className="mt-2 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-base font-semibold hover:border-primary">
                  <Camera className="h-5 w-5 text-primary" /> Vyfotit nebo nahrát
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                </label>
              )}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Button type="button" variant="outline" size="lg" className="w-full text-base" onClick={locate} disabled={locating}>
              <LocateFixed className="h-5 w-5" /> {locating ? "Zjišťuji polohu…" : "Použít moji polohu"}
            </Button>
            <div className="relative">
              <Label htmlFor="w-place">PSČ nebo město</Label>
              <Input id="w-place" value={d.place} autoComplete="off" onChange={(e) => setD((p) => ({ ...p, place: e.target.value, city: "" }))}
                onFocus={() => setFocus("place")} onBlur={() => setFocus(null)} placeholder="Např. 602 00 nebo Brno" className="mt-1 h-12 text-base" />
              {focus === "place" && <Suggestions items={placeItems} onPick={apply} />}
            </div>
            <div className="relative">
              <Label htmlFor="w-addr">Ulice a číslo domu</Label>
              <Input id="w-addr" value={d.address} autoComplete="off" onChange={(e) => set("address", e.target.value)}
                onFocus={() => setFocus("addr")} onBlur={() => setFocus(null)} placeholder="Začněte psát, nabídneme adresy" className="mt-1 h-12 text-base" />
              {focus === "addr" && <Suggestions items={addrItems} onPick={apply} />}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Kraj:</span>
              {editRegion ? (
                <select aria-label="Kraj" value={d.region} onChange={(e) => { set("region", e.target.value as Region); setEditRegion(false); }}
                  className="h-10 rounded-md border border-input bg-background px-3 text-base">
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              ) : (
                <>
                  <span className="font-semibold">{d.region}</span>
                  <Button type="button" variant="link" size="sm" onClick={() => setEditRegion(true)}>upravit</Button>
                </>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="w-phone">Telefon</Label>
                <Input id="w-phone" type="tel" autoComplete="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+420 777 123 456" className="mt-1 h-12 text-base" />
              </div>
              <div>
                <Label htmlFor="w-name">Jméno (nepovinné)</Label>
                <Input id="w-name" autoComplete="name" value={d.name} maxLength={100} onChange={(e) => set("name", e.target.value)} placeholder="Jak vás oslovit" className="mt-1 h-12 text-base" />
              </div>
            </div>
            <div className="rounded-xl bg-muted p-4 text-sm">
              <div className="font-bold">Shrnutí</div>
              <ul className="mt-2 space-y-1">
                <li>{TRADE_INFO[d.trade].name} · {URGENCY_LABEL[d.urgency]}{d.urgency === "planovano" && d.when ? ` · ${new Date(d.when).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}` : ""}</li>
                <li className="text-muted-foreground">{d.description}</li>
                <li>{d.address}, {city} · {d.region}</li>
                {photo && <li>Fotka přiložena</li>}
                <li className="pt-1 font-semibold">Výjezd {CALLOUT_FEE} Kč s diagnostikou, poté od {TRADE_INFO[d.trade].rate} Kč/h. Předem 0 Kč.</li>
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && <Button type="button" variant="outline" size="lg" onClick={() => setStep((s) => s - 1)} aria-label="Zpět"><ArrowLeft className="h-5 w-5" /></Button>}
        {step < 2
          ? <Button type="button" size="lg" className="flex-1 text-base font-bold" onClick={next}>Pokračovat <ArrowRight className="h-5 w-5" /></Button>
          : <Button type="button" size="lg" className="flex-1 text-base font-bold" onClick={submit} disabled={busy}>{busy ? "Odesílám…" : "Poslat poptávku a potvrdit čas"}</Button>}
      </div>
    </div>
  );
}

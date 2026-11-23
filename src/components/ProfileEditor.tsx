import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { saveMyProfile } from "@/lib/management.functions";
import { REGIONS, type Region } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = { name: string | null; address: string | null; city: string | null; postal_code: string | null; region: string | null };
export function ProfileEditor({ profile, name, onSaved }: { profile: Profile | null; name: string | null; onSaved: () => void }) {
  const save = useServerFn(saveMyProfile);
  const [busy, setBusy] = useState(false);
  return <section>
    <h2 className="text-xl font-bold">Můj profil</h2>
    <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={async e => {
      e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true);
      try { await save({ data: { name: String(f.get("name") ?? ""), address: String(f.get("address") ?? ""), city: String(f.get("city") ?? ""), postal_code: String(f.get("postal_code") ?? ""), region: String(f.get("region")) as Region } }); toast.success("Profil uložen"); onSaved(); }
      catch (err) { toast.error(err instanceof Error ? err.message : "Uložení selhalo"); } finally { setBusy(false); }
    }}>
      <div><Label htmlFor="profile-name">Jméno</Label><Input id="profile-name" name="name" defaultValue={profile?.name ?? name ?? ""} maxLength={100} autoComplete="name" /></div>
      <div><Label htmlFor="profile-address">Výchozí adresa</Label><Input id="profile-address" name="address" defaultValue={profile?.address ?? ""} maxLength={200} autoComplete="street-address" /></div>
      <div><Label htmlFor="profile-city">Město</Label><Input id="profile-city" name="city" defaultValue={profile?.city ?? ""} maxLength={100} autoComplete="address-level2" /></div>
      <div><Label htmlFor="profile-postal">PSČ</Label><Input id="profile-postal" name="postal_code" defaultValue={profile?.postal_code ?? ""} pattern="[0-9]{3} ?[0-9]{2}|" autoComplete="postal-code" /></div>
      <div><Label htmlFor="profile-region">Kraj</Label><select id="profile-region" name="region" defaultValue={profile?.region ?? "Praha"} className="w-full rounded-md border border-input bg-background p-2">{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
      <div className="flex items-end"><Button type="submit" disabled={busy}>{busy ? "Ukládám…" : "Uložit profil"}</Button></div>
    </form>
  </section>;
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Přihlášení – Fofr Mistr" },
      { name: "description", content: "Založte si účet Fofr Mistr, sledujte zakázky a sbírejte odznaky." },
      { property: "og:title", content: "Přihlášení – Fofr Mistr" },
      { property: "og:description", content: "Účet pro zákazníky i řemeslníky." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const G = <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.730-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.950-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>;

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (s && e === "SIGNED_IN") navigate({ to: "/ucet" }); });
    supabase.auth.getUser().then(({ data: d }) => { if (d.user) navigate({ to: "/ucet" }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), password = String(f.get("password"));
    setBusy(true);
    const { data, error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: String(f.get("name") || "") } } });
    setBusy(false);
    if (error) return toast.error(mode === "in" ? "Nesprávný e-mail nebo heslo." : error.message);
    if (mode === "up" && !data.session) setSent(true);
  }

  async function social(p: "google" | "apple") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Přihlášení se nepodařilo.");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl font-black">{mode === "in" ? "Přihlásit se" : "Založit účet"}</h1>
        <p className="mt-2 text-muted-foreground">Pro zákazníky i řemeslníky. Sledujte zakázky, sbírejte body a odznaky.</p>
        {sent ? (
          <div className="mt-6 rounded-lg border border-border bg-card p-5">Poslali jsme vám e-mail. Potvrďte odkaz a pak se přihlaste.</div>
        ) : (
          <>
            <div className="mt-6 grid gap-2">
              <Button type="button" variant="outline" onClick={() => social("google")} className="h-11 gap-2.5 border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F2F2F2] hover:text-[#1F1F1F]">{G} Pokračovat přes Google</Button>
              <Button type="button" onClick={() => social("apple")} className="h-11 bg-[#000000] text-[#FFFFFF] hover:bg-[#000000]/85">Pokračovat přes Apple</Button>
            </div>
            <div className="my-5 text-center text-xs text-muted-foreground">nebo e-mailem</div>
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "up" && <div><Label htmlFor="name">Jméno</Label><Input id="name" name="name" maxLength={80} className="mt-1" /></div>}
              <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required className="mt-1" /></div>
              <div><Label htmlFor="password">Heslo</Label><Input id="password" name="password" type="password" required minLength={8} className="mt-1" /></div>
              <Button type="submit" disabled={busy} className="w-full">{busy ? "Moment…" : mode === "in" ? "Přihlásit" : "Založit účet"}</Button>
            </form>
            <Button variant="link" className="mt-3 px-0" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Nemáte účet? Zaregistrujte se" : "Máte účet? Přihlaste se"}</Button>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

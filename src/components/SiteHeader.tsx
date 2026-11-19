import { Link } from "@tanstack/react-router";
import { UserRound, Zap } from "lucide-react";
import { useSessionUser } from "@/hooks/use-session";
import { TRADE_INFO, SERVICE_ORDER } from "@/lib/content";

export function SiteHeader() {
  const user = useSessionUser();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-black">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground"><Zap className="h-5 w-5" /></span>
          Fofr Mistr
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <a href="/#sluzby" className="hidden lg:inline hover:text-primary">Služby</a>
          <a href="/#jak" className="hidden lg:inline hover:text-primary">Jak to funguje</a>
          <Link to="/cenik" className="hidden md:inline hover:text-primary" activeProps={{ className: "text-primary" }}>Ceník</Link>
          <Link to="/pro-remeslniky" className="hidden md:inline hover:text-primary" activeProps={{ className: "text-primary" }}>Pro řemeslníky</Link>
          <a href="/#objednat" className="hidden rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 sm:inline-block">Objednat mistra</a>
          <Link to={user ? "/ucet" : "/auth"} aria-label={user ? "Můj účet" : "Přihlásit"} title={user ? "Můj účet" : "Přihlásit"}
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground hover:text-primary">
            <UserRound className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const col = "space-y-2 text-sm";
  const head = "mb-3 text-xs font-bold uppercase tracking-widest opacity-70";
  return (
    <footer className="border-t border-border bg-secondary pb-24 text-secondary-foreground md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div><div className={head}>Služby</div><ul className={col}>{SERVICE_ORDER.map((t) => <li key={t}><a href="/#objednat" className="hover:text-primary">{TRADE_INFO[t].name}</a></li>)}<li><Link to="/cenik" className="hover:text-primary">Ceník</Link></li></ul></div>
        <div><div className={head}>Pro řemeslníky</div><ul className={col}><li><Link to="/pro-remeslniky" className="hover:text-primary">Přidejte se do sítě</Link></li><li><Link to="/auth" className="hover:text-primary">Přihlásit</Link></li></ul></div>
        <div><div className={head}>Dispečink a právní</div><ul className={col}><li><Link to="/dispecink" className="hover:text-primary">Dispečink</Link></li><li className="opacity-70">Obchodní podmínky (připravujeme)</li><li className="opacity-70">Ochrana osobních údajů (připravujeme)</li></ul></div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-secondary-foreground/15 px-4 py-6 text-sm opacity-80">
        © {new Date().getFullYear()} Fofr Mistr · Expresní řemeslníci po celé ČR · Platíte až po hotové práci
      </div>
    </footer>
  );
}

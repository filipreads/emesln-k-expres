import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-black">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground"><Zap className="h-5 w-5" /></span>
          Fofr Mistr
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link to="/cenik" className="hidden sm:inline hover:text-primary" activeProps={{ className: "text-primary" }}>Ceník</Link>
          <Link to="/pro-remeslniky" className="hidden sm:inline hover:text-primary" activeProps={{ className: "text-primary" }}>Pro řemeslníky</Link>
          <Link to="/dispecink" className="hidden md:inline text-muted-foreground hover:text-primary">Dispečink</Link>
          <a href="/#objednat" className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">Objednat</a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm opacity-80">
        © {new Date().getFullYear()} Fofr Mistr · Expresní řemeslníci po celé Praze · Platíte až po hotové práci
      </div>
    </footer>
  );
}

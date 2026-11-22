export const TRADE_INFO = {
  voda: { name: "Voda a odpady", desc: "Prasklé potrubí, ucpaný odpad, kapající baterie, WC.", rate: 790 },
  elektro: { name: "Elektro", desc: "Výpadek proudu, jistič, zásuvky, světla.", rate: 850 },
  zamecnik: { name: "Zámečník", desc: "Otevření zabouchnutých dveří, výměna vložky.", rate: 950 },
  manzel: { name: "Hodinový manžel", desc: "Montáž nábytku, vrtání, police, drobné opravy.", rate: 590 },
} as const;
export type Trade = keyof typeof TRADE_INFO;
export const CALLOUT_FEE = 690;

export type Urgency = "havarie" | "dnes" | "planovano";
export const URGENCY_LABEL: Record<Urgency, string> = { havarie: "Havárie – ihned", dnes: "Drobná oprava dnes", planovano: "Plánovaný termín" };
export const urgencyLabel = (u: string) => URGENCY_LABEL[u as Urgency] ?? u;

export function formatPreferredTime(value: string) {
  return new Date(value).toLocaleString("cs-CZ", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Prague",
  });
}

/** Accepting a scheduled job does not mean travelling to the customer now. */
export function shouldShowArrivalCountdown(order: { urgency: string; status: string; arrival_minutes: number | null }) {
  return order.urgency !== "planovano" && order.status === "prijato"
    && order.arrival_minutes !== null && order.arrival_minutes > 0;
}

/** Orientační cena: výjezd s diagnostikou + 1 až 2 hodiny práce podle oboru. */
export function estimatePrice(trade: Trade) {
  const rate = TRADE_INFO[trade].rate;
  return { low: CALLOUT_FEE + rate, high: CALLOUT_FEE + 2 * rate };
}

/** Příběh zakázky – co se právě děje, lidskými slovy. */
export const STATUS_STORY = {
  nova: "Vaši poptávku jsme přijali a čteme, co se stalo.",
  oslovovani: "Oslovujeme ověřené mistry ve vašem kraji.",
  prijato: "Mistr zakázku přijal a chystá se k vám.",
  na_ceste: "Mistr už jede. Připravte prosím přístup k závadě.",
  dokonceno: "Hotovo. Děkujeme, že jste nám dali důvěru.",
} as const;

/** Řemesla výstavně presented in the hero section (elektro zůstává v objednávkovém formuláři). */
export const HERO_TRADES: Trade[] = ["voda", "zamecnik", "manzel"];

export const HERO_COPY: Record<Trade, string> = {
  voda: "Havarijní úniky, ucpaný odpad, kapající baterie.",
  elektro: "Výpadek proudu, jistič, zásuvky, světla.",
  zamecnik: "Zabouchnuté dveře, výměna vložky zámku.",
  manzel: "Montáž nábytku, vrtání, drobné opravy.",
};

export const STATUS_LABEL = {
  nova: "Nová",
  oslovovani: "Oslovování",
  prijato: "Přijato řemeslníkem",
  na_ceste: "Na cestě",
  dokonceno: "Dokončeno",
} as const;

/** Nejčastější závady – rychlé štítky na kartách služeb. */
export const QUICK_ISSUES: Record<Trade, string[]> = {
  voda: ["Prasklá trubka", "Ucpaný odpad", "Teče WC"],
  zamecnik: ["Zabouchnuté dveře", "Výměna vložky", "Zaseklý zámek"],
  elektro: ["Vypadlý jistič", "Nejde zásuvka", "Výměna světla"],
  manzel: ["Montáž nábytku", "Vrtání a police", "Drobná oprava"],
};
export const SERVICE_ORDER: Trade[] = ["voda", "zamecnik", "elektro", "manzel"];

export const FAQ = [
  ["Kolik zaplatím za výjezd?", `Pevný výjezd stojí ${CALLOUT_FEE} Kč a zahrnuje dopravu i diagnostiku. Pak se platí hodinová sazba podle oboru.`],
  ["Dozvím se cenu předem?", "Ano. Mistr vám po diagnostice řekne odhad ceny a s opravou začne až po vašem souhlasu."],
  ["Jezdíte i o víkendu a v noci?", "Poptávku můžete poslat kdykoli. Dostupnost o víkendu a v noci závisí na volných mistrech ve vašem kraji – dispečink vám potvrdí reálný čas."],
  ["Musím platit předem?", "Ne. Předem platíte 0 Kč, platí se až po hotové práci kartou nebo hotově."],
  ["Jakou záruku na práci mám?", "Řemeslníci v síti jsou ověření a pojištění. Případnou reklamaci řešíte přes náš dispečink."],
  ["Kde všude působíte?", "Poptávky přijímáme v celé České republice. Rychlost dojezdu se liší podle lokality."],
] as const;


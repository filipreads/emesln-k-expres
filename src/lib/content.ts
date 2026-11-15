export const TRADE_INFO = {
  voda: { name: "Voda a odpady", desc: "Prasklé potrubí, ucpaný odpad, kapající baterie, WC.", rate: 790 },
  elektro: { name: "Elektro", desc: "Výpadek proudu, jistič, zásuvky, světla.", rate: 850 },
  zamecnik: { name: "Zámečník", desc: "Otevření zabouchnutých dveří, výměna vložky.", rate: 950 },
  manzel: { name: "Hodinový manžel", desc: "Montáž nábytku, vrtání, police, drobné opravy.", rate: 590 },
} as const;
export type Trade = keyof typeof TRADE_INFO;
export const CALLOUT_FEE = 690;

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

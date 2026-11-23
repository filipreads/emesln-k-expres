# Plán: jen e-mail místo telefonu + vylepšení dispečinku, účtů a portálu mistra

## 1. Konec telefonní komunikace
- Formulář objednávky: místo telefonu povinný e-mail (u přihlášeného předvyplněný).
- Přihláška řemeslníka: e-mail místo telefonu.
- Odstranit „Zavolejte mi", „Zavolat dispečink", „Zavolat mistrovi" a všechny odkazy na volání (mobilní lišta, sledování, účet, portál, dispečink).
- Seznam „Zavolat zpět" v dispečinku nahradí „Dotazy e-mailem" (krátký formulář: e-mail + zpráva).
- Stávající telefonní čísla v datech zůstanou uložená, jen se už nebudou zobrazovat ani sbírat (nic se nemaže).
- Úkol „SMS oznámení" se ruší.

## 2. Automatické e-maily (z vaší vlastní domény)
- Zákazník: potvrzení přijetí objednávky s odkazem na sledování; mistr přijal; mistr na cestě; hotovo + prosba o hodnocení.
- Řemeslník: potvrzení přihlášky; schválení s odkazem na soukromý přehled; nová nabídka zakázky v jeho kraji a oboru.
- Dispečink: upozornění na novou objednávku a na zakázky, které AI nedokázala zařadit.
- Podmínka: připojená a ověřená e-mailová doména, kterou vlastníte. Bez ní vše ostatní funguje, jen se e-maily neodesílají.

## 3. Dispečink
- Filtry (stav, obor, kraj, naléhavost) a vyhledávání podle adresy či e-mailu.
- Automatické obnovení přehledu každých 30 s + upozornění na nové objednávky.
- U zakázky: přiřazení konkrétního mistra ručně, poznámka dispečera, zrušení zakázky.
- Statistiky dne: nové, přijaté, dokončené, průměrné hodnocení.

## 4. Uživatelské účty
- Úprava profilu (jméno, výchozí adresa) a předvyplnění formuláře.
- Zrušení vlastní objednávky, dokud ji nikdo nepřijal.
- Nastavení, které e-maily chce dostávat.

## 5. Portál řemeslníka
- Přepínač „Jsem volný / nedostupný" přímo v portálu (ne jen přes dispečink).
- Historie dokončených zakázek, průměrné hodnocení a počet zakázek.
- Přehlednější stavová tlačítka a potvrzení před dokončením.

## 6. Spolehlivost backendu
- Omezení počtu odeslaných objednávek / dotazů z jedné adresy (ochrana proti spamu).
- Záznam historie změn stavu každé zakázky (kdo a kdy).
- Indexy pro rychlé filtrování na dispečinku.
- Testy pro nová pravidla (zrušení jen před přijetím, omezení odesílání, volnost mistra).

## Technické poznámky
- Nové sloupce `email` (service_requests, craftsman_applications), tabulky `contact_messages`, `request_events`; vše jen přes serverové funkce, bez veřejných RLS politik.
- E-maily přes spravované odesílání Lovable se šablonami; odeslání vždy na serveru s klíčem idempotence.

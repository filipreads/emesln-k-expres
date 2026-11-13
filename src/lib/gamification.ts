export type Role = "customer" | "craftsman";
export type GameJob = { status: string; created_at: string; updated_at?: string; arrival_minutes: number | null };
export type Achievement = { id: string; name: string; description: string; earned: boolean };

export const FAST_MINUTES = 45;
export const POINTS = { order: 20, done: 100, fast: 50 } as const;
export const LEVEL_SIZE = 300;

function hasStreak(dates: number[], count: number, days: number) {
  const s = [...dates].sort((a, b) => a - b);
  for (let i = 0; i + count - 1 < s.length; i++) if (s[i + count - 1] - s[i] <= days * 86400000) return true;
  return false;
}

export function computeGame(jobs: GameJob[], role: Role) {
  const done = jobs.filter((j) => j.status === "dokonceno");
  const fast = done.filter((j) => j.arrival_minutes !== null && j.arrival_minutes <= FAST_MINUTES);
  const points = (role === "customer" ? jobs.length * POINTS.order : 0) + done.length * POINTS.done + fast.length * POINTS.fast;
  const level = Math.floor(points / LEVEL_SIZE) + 1;
  const streakDates = (role === "customer" ? jobs : done).map((j) => Date.parse(j.updated_at && role === "craftsman" ? j.updated_at : j.created_at));
  const achievements: Achievement[] = role === "customer"
    ? [
        { id: "first_order", name: "První objednávka", description: "Odeslali jste první požadavek.", earned: jobs.length >= 1 },
        { id: "first_done", name: "Vyřešeno", description: "První dokončená zakázka.", earned: done.length >= 1 },
        { id: "fast", name: "Fofr dojezd", description: `Mistr dorazil do ${FAST_MINUTES} minut.`, earned: fast.length >= 1 },
        { id: "streak", name: "Série", description: "3 objednávky během 30 dní.", earned: hasStreak(streakDates, 3, 30) },
        { id: "regular", name: "Stálý zákazník", description: "5 dokončených zakázek.", earned: done.length >= 5 },
      ]
    : [
        { id: "first_job", name: "První zakázka", description: "Dokončili jste první zakázku.", earned: done.length >= 1 },
        { id: "fast", name: "Rychlík", description: `Dojezd do ${FAST_MINUTES} minut.`, earned: fast.length >= 1 },
        { id: "streak", name: "Série", description: "3 dokončené zakázky během 30 dní.", earned: hasStreak(streakDates, 3, 30) },
        { id: "pro", name: "Mistr oboru", description: "25 dokončených zakázek.", earned: done.length >= 25 },
      ];
  return { points, level, nextLevelAt: level * LEVEL_SIZE, achievements };
}

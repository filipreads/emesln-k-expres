export type RecentOrder = { token: string; id: string; trade: string; at: string };
const KEY = "fofr-orders-v1";

/** Objednávky z tohoto zařízení, aby se k nim host vrátil i po zavření stránky. */
export function readOrders(): RecentOrder[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.slice(0, 10) : []; } catch { return []; }
}
export function rememberOrder(o: RecentOrder) {
  try { localStorage.setItem(KEY, JSON.stringify([o, ...readOrders().filter((x) => x.token !== o.token)].slice(0, 10))); } catch { /* ignore */ }
}

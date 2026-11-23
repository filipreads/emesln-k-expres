import { z } from "zod";

export const DISPATCH_EMAIL = "Dirtparkborsov@gmail.com";
export const emailSchema = z.string().trim().toLowerCase().email("Zadejte platný e-mail").max(254);
export function canCancelOrder(order: { status: string; assigned_craftsman_id: string | null; cancelled_at: string | null }) {
  return !order.cancelled_at && !order.assigned_craftsman_id && ["nova", "oslovovani"].includes(order.status);
}
export function canSetAvailable(activeJobs: number) { return activeJobs === 0; }
export function canChangeStatus(current: string, next: string) {
  return (current === "nova" && next === "oslovovani") || (current === "prijato" && next === "na_ceste") || (current === "na_ceste" && next === "dokonceno");
}

export const AVAILABILITY_STALE_MS = 12 * 60 * 60 * 1000;

/** Only a recent dispatcher update can support a live availability claim. */
export function availableCount(
  availability: { available_count: number; updated_at: string },
  now: number,
) {
  const age = now - Date.parse(availability.updated_at);
  return Number.isFinite(age) && age >= 0 && age < AVAILABILITY_STALE_MS
    ? availability.available_count
    : 0;
}
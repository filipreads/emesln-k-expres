export const REGIONS = ["Praha", "Středočeský kraj", "Jihočeský kraj", "Plzeňský kraj", "Karlovarský kraj", "Ústecký kraj", "Liberecký kraj", "Královéhradecký kraj", "Pardubický kraj", "Kraj Vysočina", "Jihomoravský kraj", "Olomoucký kraj", "Zlínský kraj", "Moravskoslezský kraj"] as const;

export function canOffer(request: { trade: string; region: string | null }, craftsman: { trade: string; region: string | null; approved: boolean; available: boolean }) {
  return craftsman.approved && craftsman.available && request.region !== null && request.region === craftsman.region && request.trade === craftsman.trade;
}

export function canProgress(current: string, next: string) {
  return (current === "prijato" && next === "na_ceste") || (current === "na_ceste" && next === "dokonceno");
}
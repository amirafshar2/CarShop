import type { ServiceItem } from "@/lib/api";
import { toman } from "@/lib/format";

export const priceTypeLabels = { Fixed: "Festpreis", From: "Preis ab", OnCall: "Auf Anfrage" } as const;

/** Main price line shown to customers. */
export function servicePrice(s: Pick<ServiceItem, "priceType" | "priceRial">): string {
  if (s.priceType === "OnCall" || s.priceRial == null) return "Auf Anfrage";
  return s.priceType === "From" ? `von ${toman(s.priceRial)}` : toman(s.priceRial);
}

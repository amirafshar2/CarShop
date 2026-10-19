import type { ServiceItem } from "@/lib/api";
import { toman } from "@/lib/format";

export const priceTypeLabels = { Fixed: "قیمت ثابت", From: "شروع قیمت از", OnCall: "تماس بگیرید" } as const;

/** Main price line shown to customers. */
export function servicePrice(s: Pick<ServiceItem, "priceType" | "priceRial">): string {
  if (s.priceType === "OnCall" || s.priceRial == null) return "تماس بگیرید";
  return s.priceType === "From" ? `از ${toman(s.priceRial)}` : toman(s.priceRial);
}

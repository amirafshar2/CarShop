import type { LeadType, ServiceCategory, ServiceItem } from "@/lib/api";
import { toman } from "@/lib/format";

export const categoryLabels: Record<ServiceCategory, string> = {
  Detailing: "دیتیلینگ و زیبایی خودرو",
  Purchase: "خرید و فروش خودرو",
  Paperwork: "کارشناسی و امور اداری",
  Other: "سایر خدمات",
};

export const categoryLeadType: Record<ServiceCategory, LeadType> = {
  Detailing: "Detailing",
  Purchase: "Sourcing",
  Paperwork: "General",
  Other: "General",
};

export const priceTypeLabels = { Fixed: "قیمت ثابت", From: "شروع قیمت از", OnCall: "تماس بگیرید" } as const;

/** Main price line shown to customers. */
export function servicePrice(s: Pick<ServiceItem, "priceType" | "priceRial">): string {
  if (s.priceType === "OnCall" || s.priceRial == null) return "تماس بگیرید";
  return s.priceType === "From" ? `از ${toman(s.priceRial)}` : toman(s.priceRial);
}

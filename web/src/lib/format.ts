const faDigits = new Intl.NumberFormat("fa-IR");
const faPlain = new Intl.NumberFormat("fa-IR", { useGrouping: false });

/** Years and other identifiers: no thousands separator (۲۰۲۵, not ۲٬۰۲۵). */
export const faNum = (n: number) => faPlain.format(n);

/** 1234 → "۱٬۲۳۴" */
export const fa = (n: number) => faDigits.format(n);

/** Rial (as stored by the API) → human Toman string, e.g. "۸٫۵ میلیارد تومان". */
export function toman(rial: number | null | undefined): string {
  if (rial == null) return "قیمت تماس";
  const t = rial / 10;
  if (t >= 1_000_000_000) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(t / 1_000_000_000)} میلیارد تومان`;
  if (t >= 1_000_000) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(t / 1_000_000)} میلیون تومان`;
  return `${fa(t)} تومان`;
}

export const km = (n: number) => (n === 0 ? "صفر کیلومتر" : `${fa(n)} کیلومتر`);

export const year = (y: number, calendar: "Gregorian" | "Solar") => (calendar === "Solar" ? `${fa(y)}` : `${fa(y)}`);

export const tagLabels: Record<string, string> = {
  Factory: "فابریک",
  SingleKey: "تک‌کلید",
  WithPlateAndDocs: "با پلاک و مدارک",
  SameDayDelivery: "تحویل روز",
  SingleSheetDeed: "تک برگ سند",
  NoCommission: "بدون کمیسیون",
};

export const tagList = (tags: string) =>
  tags && tags !== "None" ? tags.split(",").map((t) => tagLabels[t.trim()] ?? t.trim()) : [];

export const listingLabels: Record<string, string> = { Regular: "موجود در نمایشگاه", TemporaryPass: "گذر موقت", Hawaleh: "حواله" };
export const conditionLabels: Record<string, string> = { New: "صفر", Used: "کارکرده" };
export const transmissionLabels: Record<string, string> = { Automatic: "اتومات", Manual: "دنده‌ای" };
export const fuelLabels: Record<string, string> = { Gasoline: "بنزینی", Hybrid: "هیبرید", Electric: "برقی", Diesel: "دیزل", Cng: "دوگانه‌سوز" };
export const drivetrainLabels: Record<string, string> = { TwoWheel: "تک‌دیفرانسیل", FourWheel: "دودیفرانسیل" };
export const hawalehLabels: Record<string, string> = { Factory: "کارخانه", Veteran: "جانبازی", Import: "واردات" };

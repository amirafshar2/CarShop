const deDigits = new Intl.NumberFormat("de-DE");
const dePlain = new Intl.NumberFormat("de-DE", { useGrouping: false });

/** Years and other identifiers: no thousands separator (2025, not 2.025). */
export const faNum = (n: number) => dePlain.format(n);

/** 1234 → "1.234" */
export const fa = (n: number) => deDigits.format(n);

/** Price as stored by the API (integer cents) → "24.900 €"; null → "Auf Anfrage". */
export function toman(cents: number | null | undefined): string {
  if (cents == null) return "Auf Anfrage";
  const euro = cents / 100;
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: euro % 1 === 0 ? 0 : 2, minimumFractionDigits: euro % 1 === 0 ? 0 : 2 }).format(euro)} €`;
}

export const km = (n: number) => (n === 0 ? "0 km (Neuwagen)" : `${fa(n)} km`);

export const year = (y: number, _calendar: "Gregorian" | "Solar") => dePlain.format(y);

export const tagLabels: Record<string, string> = {
  Factory: "Unfallfrei",
  SingleKey: "Zweitschlüssel vorhanden",
  WithPlateAndDocs: "Mit Zulassung und Papieren",
  SameDayDelivery: "Sofort verfügbar",
  SingleSheetDeed: "Scheckheftgepflegt",
  NoCommission: "Ohne Provision",
};

export const tagList = (tags: string) =>
  tags && tags !== "None" ? tags.split(",").map((t) => tagLabels[t.trim()] ?? t.trim()) : [];

export const listingLabels: Record<string, string> = { Regular: "Im Autohaus verfügbar", TemporaryPass: "Mit Kurzzeitkennzeichen", Hawaleh: "Vorführwagen" };
export const conditionLabels: Record<string, string> = { New: "Neuwagen", Used: "Gebrauchtwagen" };
export const transmissionLabels: Record<string, string> = { Automatic: "Automatik", Manual: "Schaltgetriebe" };
export const fuelLabels: Record<string, string> = { Gasoline: "Benzin", Hybrid: "Hybrid", Electric: "Elektro", Diesel: "Diesel", Cng: "Erdgas (CNG)" };
export const drivetrainLabels: Record<string, string> = { TwoWheel: "Frontantrieb", FourWheel: "Allradantrieb" };
export const hawalehLabels: Record<string, string> = { Factory: "Werk", Veteran: "Sonderkontingent", Import: "Import" };

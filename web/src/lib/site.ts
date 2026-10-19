import { getSiteRaw, type Listing } from "@/lib/api";
import { toman } from "@/lib/format";

export type FieldDef = { key: string; label: string; type: "text" | "number" | "select"; options: string[]; suffix: string | null; showOnCard: boolean; filter: boolean };
export type Highlight = { title: string; text: string | null; icon: string | null };
export type SiteContent = {
  brand: { name: string; tagline: string | null; description: string | null; logoUrl: string | null };
  theme: { primary: string; mode: "dark" | "light"; corners: "sharp" | "soft" | "round" };
  labels: { itemSingular: string; itemPlural: string; itemsPageTitle: string; requestButton: string; categoryLabel: string; soldOutLabel: string; servicesTitle: string };
  fields: FieldDef[];
  categories: string[];
  home: {
    heroTitle: string; heroSubtitle: string | null; heroImageUrl: string | null; heroVideoUrl: string | null; heroCtaText: string | null; heroCtaUrl: string | null;
    showHighlights: boolean; highlightsTitle: string | null; highlights: Highlight[];
    showFeatured: boolean; featuredTitle: string | null; showServices: boolean;
    showAbout: boolean; aboutTitle: string | null; aboutText: string | null; aboutImageUrl: string | null;
    stats: { value: string; label: string }[];
    showFaq: boolean; faq: { question: string; answer: string }[];
    showCta: boolean; ctaTitle: string | null; ctaText: string | null;
  };
  contact: { phone: string | null; whatsapp: string | null; instagram: string | null; telegram: string | null; email: string | null; address: string | null; hours: string | null; mapUrl: string | null };
  nav: { label: string; href: string }[];
  footer: { text: string | null; copyright: string | null };
  seo: { title: string | null; description: string | null };
  pages: { items: boolean; services: boolean; contact: boolean };
};
export type PublicSite = { preset: string; content: SiteContent; isPublished: boolean; setupCompleted: boolean };

/** Shown while the API is unreachable, so pages still render. */
export const FALLBACK_SITE: PublicSite = {
  preset: "services",
  isPublished: true,
  setupCompleted: true,
  content: {
    brand: { name: "سایت", tagline: null, description: null, logoUrl: null },
    theme: { primary: "#f97316", mode: "dark", corners: "soft" },
    labels: { itemSingular: "آیتم", itemPlural: "آیتم‌ها", itemsPageTitle: "همه‌ی آیتم‌ها", requestButton: "ثبت درخواست", categoryLabel: "دسته", soldOutLabel: "ناموجود", servicesTitle: "خدمات و قیمت‌ها" },
    fields: [], categories: [],
    home: { heroTitle: "", heroSubtitle: null, heroImageUrl: null, heroVideoUrl: null, heroCtaText: null, heroCtaUrl: null, showHighlights: false, highlightsTitle: null, highlights: [], showFeatured: false, featuredTitle: null, showServices: false, showAbout: false, aboutTitle: null, aboutText: null, aboutImageUrl: null, stats: [], showFaq: false, faq: [], showCta: false, ctaTitle: null, ctaText: null },
    contact: { phone: null, whatsapp: null, instagram: null, telegram: null, email: null, address: null, hours: null, mapUrl: null },
    nav: [{ label: "خانه", href: "/" }], footer: { text: null, copyright: null }, seo: { title: null, description: null }, pages: { items: true, services: true, contact: true },
  },
};

export async function getSite(): Promise<PublicSite & { offline?: boolean }> {
  const s = await getSiteRaw<PublicSite>();
  return s ?? { ...FALLBACK_SITE, offline: true };
}

/** Readable text colour on top of the brand colour. */
export function onColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? "#0a0a0b" : "#ffffff";
}

export const radiusOf = (corners: SiteContent["theme"]["corners"]) => (corners === "sharp" ? "0.25rem" : corners === "round" ? "1.25rem" : "0.75rem");

/** CSS variables injected on <html> so every component picks up the owner's colours. */
export function themeVars(t: SiteContent["theme"]): Record<string, string> {
  const fg = onColor(t.primary);
  return {
    "--primary": t.primary, "--ring": t.primary, "--sidebar-primary": t.primary, "--sidebar-ring": t.primary,
    "--primary-foreground": fg, "--sidebar-primary-foreground": fg, "--radius": radiusOf(t.corners),
  };
}

export const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "S").slice(0, 2)).toUpperCase();
};

export function priceText(l: Pick<Listing, "priceType" | "priceRial">): string {
  if (l.priceType === "OnCall" || l.priceRial == null) return "تماس بگیرید";
  return l.priceType === "From" ? `از ${toman(l.priceRial)}` : toman(l.priceRial);
}

const faDigits = new Intl.NumberFormat("fa-IR", { useGrouping: true });
/** Field value for display: numbers get Persian digits (years without separators), plus the suffix. */
export function fieldValue(f: FieldDef, raw: string | undefined): string | null {
  if (!raw) return null;
  let v = raw;
  if (f.type === "number" && /^\d+$/.test(raw)) {
    const n = Number(raw);
    v = n >= 1000 && n <= 2100 && f.key.includes("year") ? new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(n) : faDigits.format(n);
  }
  return f.suffix ? `${v} ${f.suffix}` : v;
}

export const whatsappLink = (n: string | null) => (n ? `https://wa.me/${n.replace(/\D/g, "")}` : null);
export const instagramLink = (h: string | null) => (h ? `https://instagram.com/${h.replace(/^@/, "")}` : null);
export const telegramLink = (h: string | null) => (h ? `https://t.me/${h.replace(/^@/, "")}` : null);

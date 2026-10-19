import type { LeadStatus, LeadType, ListingStatus } from "@/lib/api";

export const leadTypeLabels: Record<LeadType, string> = {
  General: "پیام / سؤال",
  ItemRequest: "درخواست درباره‌ی آیتم",
  ServiceRequest: "درخواست خدمت",
  Booking: "رزرو / وقت",
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  New: "جدید",
  Contacted: "تماس گرفته شد",
  Visit: "بازدید",
  Won: "موفق",
  Lost: "ناموفق",
};

export const leadStatusColor: Record<LeadStatus, string> = {
  New: "bg-primary/15 text-primary border-primary/40",
  Contacted: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  Visit: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  Won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  Lost: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",
};

export const listingStatusLabels: Record<ListingStatus, string> = {
  Draft: "پیش‌نویس",
  Published: "منتشر شده",
  Hidden: "پنهان",
  SoldOut: "ناموجود / تکمیل",
};

export const listingStatusColor: Record<ListingStatus, string> = {
  Draft: "bg-zinc-500/15 text-zinc-500 border-zinc-500/40",
  Published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40",
  Hidden: "bg-zinc-500/15 text-zinc-500 border-zinc-500/40",
  SoldOut: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/40",
};

export const roleLabels: Record<string, string> = { Admin: "مدیر", Staff: "کارمند", Customer: "مشتری" };

export const faDate = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

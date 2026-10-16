import type { CarStatus, LeadStatus, LeadType } from "@/lib/api";

export const leadTypeLabels: Record<LeadType, string> = {
  PriceRequest: "درخواست قیمت",
  VisitRequest: "رزرو بازدید",
  SellMyCar: "فروش خودروی مشتری",
  Sourcing: "خرید از راه دور",
  Hawaleh: "حواله",
  Detailing: "دیتیلینگ",
  Organization: "سازمانی",
  General: "همکاری / پیام",
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  New: "جدید",
  Contacted: "تماس گرفته شد",
  Visit: "بازدید",
  Won: "موفق (فروش)",
  Lost: "ناموفق",
};

export const leadStatusColor: Record<LeadStatus, string> = {
  New: "bg-primary/15 text-primary border-primary/40",
  Contacted: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  Visit: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  Won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  Lost: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",
};

export const carStatusLabels: Record<CarStatus, string> = {
  Draft: "پیش‌نویس",
  Available: "منتشر شده",
  Reserved: "رزرو شده",
  Sold: "فروخته شد",
  Hidden: "پنهان",
};

export const carStatusColor: Record<CarStatus, string> = {
  Draft: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
  Available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  Reserved: "bg-primary/15 text-primary border-primary/40",
  Sold: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  Hidden: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",
};

export const reservationStatusLabels: Record<string, string> = {
  Active: "فعال",
  Converted: "تبدیل به خرید",
  Expired: "منقضی شده",
  Cancelled: "لغو شده",
};

export const roleLabels: Record<string, string> = { Admin: "مدیر", Staff: "کارشناس", Customer: "مشتری" };

export const faDate = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

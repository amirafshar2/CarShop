import type { AdminSite } from "@/lib/admin-site";

export type StepKey = "type" | "brand" | "look" | "contact" | "home" | "items" | "services" | "publish";

export type StepInfo = { key: StepKey; title: string; why: string; done: (s: AdminSite) => boolean; optional?: boolean };

/** The assistant's steps, in order. `done` looks at real data, so the checklist is right even after edits elsewhere. */
export function setupSteps(s: AdminSite | null): StepInfo[] {
  const L = s?.content.labels;
  const has = (k: string) => !!s?.completedSteps.includes(k);
  return [
    { key: "type", title: "نوع کسب‌وکار", why: "اسم بخش‌ها، فیلدها و منو بر اساس نوع کسب‌وکار تنظیم می‌شود.", done: () => has("type") },
    { key: "brand", title: "نام و لوگو", why: "نام شما بالای سایت، در تب مرورگر و در گوگل دیده می‌شود.", done: (x) => x.progress.hasName },
    { key: "look", title: "رنگ و ظاهر", why: "رنگ اصلی روی دکمه‌ها و لینک‌ها می‌نشیند؛ با رنگ لوگو هماهنگش کنید.", done: () => has("look") },
    { key: "contact", title: "راه‌های تماس", why: "مشتری باید بتواند با یک کلیک زنگ بزند یا پیام بدهد.", done: (x) => x.progress.hasContact },
    { key: "home", title: "صفحه‌ی اول", why: "اولین چیزی که بازدیدکننده می‌بیند: یک تیتر واضح و یک عکس خوب.", done: (x) => x.progress.hasHero && has("home") },
    { key: "items", title: `اولین ${L?.itemSingular ?? "آیتم"}`, why: `حداقل یک ${L?.itemSingular ?? "آیتم"} اضافه کنید تا صفحه‌ی ${L?.itemPlural ?? "آیتم‌ها"} خالی نباشد.`, done: (x) => x.progress.listings > 0 },
    { key: "services", title: "خدمات و قیمت‌ها", why: "اختیاری: لیست خدمات با قیمت، برای مشتری‌هایی که دنبال قیمت‌اند.", done: (x) => x.progress.services > 0 || has("services"), optional: true },
    { key: "publish", title: "انتشار سایت", why: "تا وقتی منتشر نکنید، بازدیدکننده‌ها صفحه‌ی «به‌زودی» می‌بینند.", done: (x) => x.isPublished },
  ];
}

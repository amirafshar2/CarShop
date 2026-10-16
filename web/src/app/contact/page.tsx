"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Clock, MapPin, Phone, ShieldCheck } from "lucide-react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import ContactForm from "@/components/ui/contact-form";
import { createLead, type LeadType } from "@/lib/api";

const titles: Partial<Record<LeadType, string>> = {
  VisitRequest: "رزرو بازدید / درخواست قیمت",
  SellMyCar: "ماشینت رو بدون کمیسیون بفروش",
  Sourcing: "خرید از راه دور",
  Hawaleh: "درخواست حواله",
  Detailing: "رزرو دیتیلینگ",
  Organization: "خرید سازمانی",
  General: "دعوت به همکاری / پیام",
};

const chips: [LeadType, string][] = [
  ["VisitRequest", "بازدید و قیمت"],
  ["SellMyCar", "فروش خودروی من"],
  ["Sourcing", "خرید از راه دور"],
  ["Hawaleh", "حواله"],
  ["Detailing", "دیتیلینگ"],
  ["Organization", "سازمانی"],
  ["General", "همکاری / پیام"],
];

const channels = [
  { icon: MapPin, title: "آدرس نمایشگاه", value: "شیراز، چهارراه زرگری، برج بارانا، طبقه اول", href: "https://www.google.com/maps/search/?api=1&query=%D8%A8%D8%B1%D8%AC+%D8%A8%D8%A7%D8%B1%D8%A7%D9%86%D8%A7+%D8%B4%DB%8C%D8%B1%D8%A7%D8%B2" },
  { icon: Phone, title: "تماس مستقیم", value: "۰۹۱۷ ۱۰۰ ۶۰۰۳", href: "tel:+989171006003", ltr: true },
  { icon: FaWhatsapp, title: "واتس‌اپ", value: "پیام سریع در واتس‌اپ", href: "https://wa.me/989171006003" },
  { icon: FaInstagram, title: "اینستاگرام", value: "@moraveji.motors", href: "https://www.instagram.com/moraveji.motors", ltr: true },
];

function ContactInner() {
  const params = useSearchParams();
  const raw = params.get("type") as LeadType | null;
  const type: LeadType = raw && raw in titles ? raw : "VisitRequest";
  const carId = params.get("car") ?? undefined;
  const service = params.get("service")?.slice(0, 120) ?? undefined;

  return (
    <ContactForm
      key={type}
      eyebrow={<span className="font-semibold text-primary">مروجی موتورز · ارتباط با ما</span>}
      title={service ? `رزرو «${service}»` : titles[type] ?? "تماس با ما"}
      description="اطلاعاتت رو بفرست؛ کارشناس‌های ما در اسرع وقت باهات تماس می‌گیرن."
      details={
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">موضوع درخواست</p>
            <div className="flex flex-wrap gap-2">
              {chips.map(([t, l]) => (
                <Link
                  key={t}
                  href={`/contact?type=${t}${carId ? `&car=${carId}` : ""}`}
                  scroll={false}
                  aria-current={t === type ? "page" : undefined}
                  className={`rounded-full border px-4 py-2.5 text-[15px] font-medium transition-colors ${
                    t === type ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {channels.map((c) => (
              <li key={c.title}>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex h-full items-start gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/60 hover:bg-accent"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    <c.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-muted-foreground">{c.title}</span>
                    <span dir={c.ltr ? "ltr" : undefined} className="mt-0.5 block font-semibold text-foreground">{c.value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      }
      formHeader={
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xl font-bold">فرم درخواست</p>
            <p className="mt-1 text-sm text-muted-foreground">کمتر از یک دقیقه وقتت رو می‌گیره.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary">
            <Clock className="size-4" aria-hidden /> پاسخ سریع
          </span>
        </div>
      }
      formFooter={
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
          شماره‌ی شما فقط برای تماس کارشناس استفاده می‌شود.
        </p>
      }
      placeholders={{
        name: "مثلاً علی محمدی",
        email: "۰۹۱۲۳۴۵۶۷۸۹",
        message: type === "SellMyCar" ? "مثلاً: کمری ۲۰۱۸، ۶۰ هزار کیلومتر، سفید" : "اگر توضیحی دارید اینجا بنویسید (اختیاری)",
      }}
      labels={{
        name: "نام و نام خانوادگی",
        email: "شماره موبایل",
        message: type === "SellMyCar" ? "مشخصات خودرو (مدل، سال، کارکرد، رنگ)" : "توضیحات",
        submit: "ارسال درخواست",
        pending: "در حال ارسال…",
        success: "دریافت شد! به‌زودی با شما تماس می‌گیریم.",
        error: "ارسال انجام نشد. شماره را بررسی کنید و دوباره تلاش کنید.",
      }}
      onSubmit={async (v) => {
        const message = [service ? `خدمت: ${service}` : "", v.message].filter(Boolean).join(" — ");
        await createLead({ name: v.name, phone: v.email, type, carId, message: message || undefined });
      }}
    />
  );
}

export default function ContactPage() {
  return (
    <Suspense>
      <ContactInner />
    </Suspense>
  );
}

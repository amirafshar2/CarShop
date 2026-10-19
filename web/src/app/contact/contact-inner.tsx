"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { FaInstagram, FaTelegram, FaWhatsapp } from "react-icons/fa6";
import ContactForm from "@/components/ui/contact-form";
import { createLead, type LeadType } from "@/lib/api";
import { instagramLink, telegramLink, whatsappLink, type SiteContent } from "@/lib/site";

export default function ContactInner({ site: c }: { site: SiteContent }) {
  const params = useSearchParams();
  const itemId = params.get("item") ?? undefined;
  const itemTitle = params.get("title")?.slice(0, 150) ?? undefined;
  const service = params.get("service")?.slice(0, 120) ?? undefined;
  const raw = params.get("type") as LeadType | null;
  const type: LeadType = itemId ? "ItemRequest" : service ? "ServiceRequest" : raw === "Booking" || raw === "General" ? raw : "Booking";

  const chips: [LeadType, string][] = [["Booking", c.labels.requestButton], ["General", "سؤال / پیام"]];
  const channels = [
    c.contact.address && { icon: MapPin, title: "آدرس", value: c.contact.address, href: c.contact.mapUrl ?? undefined },
    c.contact.phone && { icon: Phone, title: "تماس مستقیم", value: c.contact.phone, href: `tel:${c.contact.phone}`, ltr: true },
    c.contact.whatsapp && { icon: FaWhatsapp, title: "واتساپ", value: "پیام در واتساپ", href: whatsappLink(c.contact.whatsapp)! },
    c.contact.instagram && { icon: FaInstagram, title: "اینستاگرام", value: `@${c.contact.instagram}`, href: instagramLink(c.contact.instagram)!, ltr: true },
    c.contact.telegram && { icon: FaTelegram, title: "تلگرام", value: `@${c.contact.telegram}`, href: telegramLink(c.contact.telegram)!, ltr: true },
    c.contact.email && { icon: Mail, title: "ایمیل", value: c.contact.email, href: `mailto:${c.contact.email}`, ltr: true },
    c.contact.hours && { icon: Clock, title: "ساعت کاری", value: c.contact.hours },
  ].filter(Boolean) as { icon: typeof Phone; title: string; value: string; href?: string; ltr?: boolean }[];

  const title = itemTitle ? `${c.labels.requestButton}: «${itemTitle}»` : service ? `رزرو «${service}»` : type === "General" ? "تماس با ما" : c.labels.requestButton;

  return (
    <ContactForm
      key={type + (itemId ?? "") + (service ?? "")}
      eyebrow={<span className="font-semibold text-primary">{c.brand.name} · ارتباط با ما</span>}
      title={title}
      description="اطلاعاتتان را بفرستید؛ در کوتاه‌ترین زمان با شما تماس می‌گیریم."
      details={
        <div className="space-y-8">
          {!itemId && !service && (
            <div className="flex flex-wrap gap-2">
              {chips.map(([t, l]) => (
                <Link key={t} href={`/contact?type=${t}`} scroll={false} aria-current={t === type ? "page" : undefined}
                  className={`rounded-full border px-4 py-2.5 text-[15px] font-medium transition-colors ${t === type ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  {l}
                </Link>
              ))}
            </div>
          )}
          {channels.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {channels.map((ch) => {
                const inner = (
                  <>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><ch.icon className="size-5" aria-hidden /></span>
                    <span className="min-w-0">
                      <span className="block text-sm text-muted-foreground">{ch.title}</span>
                      <span dir={ch.ltr ? "ltr" : undefined} className="mt-0.5 block break-words font-semibold text-foreground">{ch.value}</span>
                    </span>
                  </>
                );
                const cls = "flex h-full items-start gap-3 rounded-2xl border border-border bg-card/60 p-4";
                return (
                  <li key={ch.title}>
                    {ch.href ? (
                      <a href={ch.href} target={ch.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={`${cls} transition-colors hover:border-primary/60 hover:bg-accent`}>{inner}</a>
                    ) : (
                      <div className={cls}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      }
      formHeader={
        <div className="mb-6 border-b border-border pb-5">
          <p className="text-xl font-bold">فرم درخواست</p>
          <p className="mt-1 text-sm text-muted-foreground">کمتر از یک دقیقه وقتتان را می‌گیرد.</p>
        </div>
      }
      formFooter={
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
          شماره‌ی شما فقط برای تماس با شما استفاده می‌شود.
        </p>
      }
      placeholders={{ name: "مثلاً علی محمدی", email: "۰۹۱۲۳۴۵۶۷۸۹", message: "اگر توضیحی دارید اینجا بنویسید (اختیاری)" }}
      labels={{
        name: "نام و نام خانوادگی",
        email: "شماره موبایل",
        message: "توضیحات",
        submit: "ارسال درخواست",
        pending: "در حال ارسال…",
        success: "دریافت شد! به‌زودی با شما تماس می‌گیریم.",
        error: "ارسال انجام نشد. شماره را بررسی کنید و دوباره تلاش کنید.",
      }}
      onSubmit={async (v) => {
        const message = [service ? `خدمت: ${service}` : "", v.message].filter(Boolean).join(" — ");
        await createLead({ name: v.name, phone: v.email, type, listingId: itemId, message: message || undefined });
      }}
    />
  );
}

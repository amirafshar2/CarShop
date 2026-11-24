"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { FaInstagram, FaTelegram, FaWhatsapp } from "react-icons/fa6";
import ContactForm from "@/components/ui/contact-form";
import { useEffect, useState } from "react";
import { createLead, getDemoInfo, type LeadType } from "@/lib/api";
import { instagramLink, telegramLink, whatsappLink, type SiteContent } from "@/lib/site";

export default function ContactInner({ site: c }: { site: SiteContent }) {
  const params = useSearchParams();
  // Public demo: the request form is switched off so no personal data is collected.
  const [demo, setDemo] = useState(false);
  useEffect(() => { void getDemoInfo().then((d) => setDemo(d.enabled && !d.requiresKey)); }, []);
  const itemId = params.get("item") ?? undefined;
  const itemTitle = params.get("title")?.slice(0, 150) ?? undefined;
  const service = params.get("service")?.slice(0, 120) ?? undefined;
  const raw = params.get("type") as LeadType | null;
  const type: LeadType = itemId ? "ItemRequest" : service ? "ServiceRequest" : raw === "Booking" || raw === "General" ? raw : "Booking";

  const chips: [LeadType, string][] = [["Booking", c.labels.requestButton], ["General", "Frage / Nachricht"]];
  const channels = [
    c.contact.address && { icon: MapPin, title: "Adresse", value: c.contact.address, href: c.contact.mapUrl ?? undefined },
    c.contact.phone && { icon: Phone, title: "Direkter Kontakt", value: c.contact.phone, href: `tel:${c.contact.phone}`, ltr: true },
    c.contact.whatsapp && { icon: FaWhatsapp, title: "WhatsApp", value: "Nachricht per WhatsApp", href: whatsappLink(c.contact.whatsapp)! },
    c.contact.instagram && { icon: FaInstagram, title: "Instagram", value: `@${c.contact.instagram}`, href: instagramLink(c.contact.instagram)!, ltr: true },
    c.contact.telegram && { icon: FaTelegram, title: "Telegram", value: `@${c.contact.telegram}`, href: telegramLink(c.contact.telegram)!, ltr: true },
    c.contact.email && { icon: Mail, title: "E-Mail", value: c.contact.email, href: `mailto:${c.contact.email}`, ltr: true },
    c.contact.hours && { icon: Clock, title: "Öffnungszeiten", value: c.contact.hours },
  ].filter(Boolean) as { icon: typeof Phone; title: string; value: string; href?: string; ltr?: boolean }[];

  const title = itemTitle ? `${c.labels.requestButton}: «${itemTitle}»` : service ? `Buchung „${service}»` : type === "General" ? "Kontakt" : c.labels.requestButton;

  return (
    <ContactForm
      key={type + (itemId ?? "") + (service ?? "")}
      eyebrow={<span className="font-semibold text-primary">{c.brand.name} · Kontakt</span>}
      title={title}
      description="Schicken Sie uns Ihre Daten – wir melden uns so schnell wie möglich."
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
      replaceForm={demo ? (
        <div data-testid="demo-form-off">
          <p className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-5 text-primary" aria-hidden />Demo-Projekt</p>
          <p className="mt-3 leading-7 text-muted-foreground">
            Das Anfrageformular ist in der Demo abgeschaltet – es werden keine persönlichen Daten erhoben. Anfragen im Panel sehen Sie über den Demo-Login (Rollen-Buttons).
          </p>
          <p className="mt-4 text-sm">
            <Link href="/login" className="font-semibold text-primary hover:underline">Zum Demo-Login</Link>
            {" · "}
            <a href="https://amirrezaafshar.de/impressum" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Impressum</a>
            {" · "}
            <a href="https://amirrezaafshar.de/datenschutz" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Datenschutz</a>
          </p>
        </div>
      ) : undefined}
      formHeader={
        <div className="mb-6 border-b border-border pb-5">
          <p className="text-xl font-bold">Anfrageformular</p>
          <p className="mt-1 text-sm text-muted-foreground">Dauert weniger als eine Minute.</p>
        </div>
      }
      formFooter={
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
          Ihre Nummer wird nur verwendet, um Sie zu kontaktieren.
        </p>
      }
      placeholders={{ name: "z. B. Max Mustermann", email: "0151 23456789", message: "Wenn Sie etwas ergänzen möchten, schreiben Sie es hier (optional)" }}
      labels={{
        name: "Vor- und Nachname",
        email: "Handynummer",
        message: "Beschreibung",
        submit: "Anfrage senden",
        pending: "Wird gesendet…",
        success: "Angekommen! Wir melden uns bald bei Ihnen.",
        error: "Senden fehlgeschlagen. Bitte die Nummer prüfen und erneut versuchen.",
      }}
      onSubmit={async (v) => {
        const message = [service ? `Leistung: ${service}` : "", v.message].filter(Boolean).join(" — ");
        await createLead({ name: v.name, phone: v.email, type, listingId: itemId, message: message || undefined });
      }}
    />
  );
}

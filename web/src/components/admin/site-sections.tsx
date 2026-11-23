"use client";

import { Moon, Sun } from "lucide-react";
import { AreaField, ColorField, HeroVideoField, ImageField, ImagesField, ListEditor, SwitchRow, TextField } from "@/components/admin/fields";
import { ICONS, SiteIcon } from "@/components/site/icon";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials, onColor, radiusOf, type FieldDef, type NavLink, type SiteContent } from "@/lib/site";
import { mediaUrl } from "@/lib/api";

export type SetFn = (path: string, value: unknown) => void;
type P = { c: SiteContent; set: SetFn };

export function BrandSection({ c, set }: P) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField label="Name des Unternehmens" required value={c.brand.name} onChange={(v) => set("brand.name", v)} max={60} placeholder="z. B. Reisebüro Himmelblau" hint="Erscheint oben auf der Website, im Browser-Tab und im Footer." />
      <TextField label="Kurzer Slogan" value={c.brand.tagline} onChange={(v) => set("brand.tagline", v)} max={120} placeholder="z. B. Sorglos reisen – von der Buchung bis zur Rückkehr" />
      <AreaField className="sm:col-span-2" label="Kurzbeschreibung des Unternehmens" value={c.brand.description} onChange={(v) => set("brand.description", v)} max={500} rows={3} hint="Wird für Google und den Footer verwendet; ein, zwei Sätze genügen." />
      <ImageField className="sm:col-span-2" label="Logo" value={c.brand.logoUrl} onChange={(v) => set("brand.logoUrl", v)} hint="Am besten ein PNG mit transparentem Hintergrund. Ohne Logo erscheinen die Anfangsbuchstaben des Namens." />
    </div>
  );
}

export function LookSection({ c, set }: P) {
  const t = c.theme;
  return (
    <div className="grid gap-6">
      <ColorField value={t.primary} onChange={(v) => set("theme.primary", v)} />
      <div className="grid gap-3">
        <span className="text-sm font-medium">Farbmodus</span>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          {([["light", "Hell", Sun], ["dark", "Dunkel", Moon]] as const).map(([v, l, Icon]) => (
            <button key={v} type="button" onClick={() => set("theme.mode", v)} aria-pressed={t.mode === v}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 font-semibold ${t.mode === v ? "border-primary bg-primary/10" : "border-border"}`}>
              <Icon className="size-5" aria-hidden />{l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <span className="text-sm font-medium">Ecken</span>
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          {([["sharp", "eckig"], ["soft", "weich"], ["round", "rund"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => set("theme.corners", v)} aria-pressed={t.corners === v}
              className={`border-2 p-4 text-sm font-semibold ${t.corners === v ? "border-primary bg-primary/10" : "border-border"}`} style={{ borderRadius: radiusOf(v) }}>{l}</button>
          ))}
        </div>
      </div>
      {/* Mini preview */}
      <div className={`overflow-hidden rounded-2xl border border-border ${t.mode === "dark" ? "bg-[#0a0a0b] text-white" : "bg-white text-neutral-900"}`} aria-label="Vorschau">
        <div className="flex items-center gap-2 border-b border-current/10 p-4">
          {c.brand.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={mediaUrl(c.brand.logoUrl)} alt="" className="h-8 w-auto" />
            : <span className="grid size-8 place-items-center rounded-lg text-xs font-black" style={{ background: t.primary, color: onColor(t.primary) }}>{initials(c.brand.name || "S")}</span>}
          <span className="font-bold">{c.brand.name || "Name des Unternehmens"}</span>
        </div>
        <div className="p-6">
          <p className="text-2xl font-black">{c.home.heroTitle || "Überschrift der Startseite"}</p>
          <span className="mt-4 inline-block px-5 py-2.5 text-sm font-bold" style={{ background: t.primary, color: onColor(t.primary), borderRadius: radiusOf(t.corners) }}>{c.labels.requestButton}</span>
        </div>
      </div>
    </div>
  );
}

export function ContactSection({ c, set }: P) {
  const k = c.contact;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField label="Telefon" dir="ltr" value={k.phone} onChange={(v) => set("contact.phone", v)} max={20} placeholder="02112345678" />
      <TextField label="WhatsApp" dir="ltr" value={k.whatsapp} onChange={(v) => set("contact.whatsapp", v)} max={20} placeholder="4915123456789" hint="Mit Ländervorwahl und ohne führende Null, z. B. 4915123456789" />
      <TextField label="Instagram" dir="ltr" value={k.instagram} onChange={(v) => set("contact.instagram", v)} max={40} placeholder="my.page" hint="Nur der Benutzername, ohne @" />
      <TextField label="Telegram" dir="ltr" value={k.telegram} onChange={(v) => set("contact.telegram", v)} max={40} placeholder="my_channel" />
      <TextField label="E-Mail" dir="ltr" type="email" value={k.email} onChange={(v) => set("contact.email", v)} max={80} />
      <TextField label="Öffnungszeiten" value={k.hours} onChange={(v) => set("contact.hours", v)} max={80} placeholder="Mo–Fr 9–19 Uhr, Sa 10–16 Uhr" />
      <AreaField className="sm:col-span-2" label="Adresse" value={k.address} onChange={(v) => set("contact.address", v)} max={200} rows={2} />
      <TextField className="sm:col-span-2" label="Kartenlink (Google Maps)" dir="ltr" value={k.mapUrl} onChange={(v) => set("contact.mapUrl", v)} max={500} placeholder="https://…" />
    </div>
  );
}

export function HeroSection({ c, set }: P) {
  const h = c.home;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField className="sm:col-span-2" label="Kleiner Text über der Überschrift" value={h.heroEyebrow} onChange={(v) => set("home.heroEyebrow", v)} max={80} placeholder={c.brand.tagline ?? "z. B. Ihr Autohaus in Esslingen"} />
      <TextField className="sm:col-span-2" label="Große Überschrift der Startseite" value={h.heroTitle} onChange={(v) => set("home.heroTitle", v)} max={120} placeholder="z. B. Wählen Sie hier Ihre nächste Reise" />
      <AreaField className="sm:col-span-2" label="Unterzeile" value={h.heroSubtitle} onChange={(v) => set("home.heroSubtitle", v)} max={300} rows={2} />
      <TextField label="Button-Text" value={h.heroCtaText} onChange={(v) => set("home.heroCtaText", v)} max={40} placeholder={`Alle ${c.labels.itemPlural}`} />
      <TextField label="Button-Link" dir="ltr" value={h.heroCtaUrl} onChange={(v) => set("home.heroCtaUrl", v)} max={300} placeholder="/items" hint="/items Einträge, /services Leistungen, /contact Kontakt" />
      <ImageField label="Hintergrundbild" value={h.heroImageUrl} onChange={(v) => set("home.heroImageUrl", v)} hint="Querformat in guter Qualität, mindestens 1600 Pixel breit." />
      <HeroVideoField value={h.heroVideoUrl} optimized={h.heroVideoOptimized} mode={h.heroVideoMode}
        onChange={(p) => {
          if (p.url !== undefined) set("home.heroVideoUrl", p.url);
          if (p.optimized !== undefined) set("home.heroVideoOptimized", p.optimized);
          if (p.mode) set("home.heroVideoMode", p.mode);
          if (p.poster && !h.heroImageUrl) set("home.heroImageUrl", p.poster);
        }} />
    </div>
  );
}

export function HomeMoreSection({ c, set }: P) {
  const h = c.home;
  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <SwitchRow label="Bereich Schritte / Vorteile" hint="Wenn Sie zu allen Einträgen ein Bild hinzufügen, erscheint der Bereich als Scroll-Story (das Bild wechselt beim Scrollen)." checked={h.showHighlights} onChange={(v) => set("home.showHighlights", v)} />
        {h.showHighlights && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Kleiner Text über dem Titel" value={h.highlightsEyebrow} onChange={(v) => set("home.highlightsEyebrow", v)} max={60} />
              <TextField className="sm:col-span-2" label="Titel des Bereichs" value={h.highlightsTitle} onChange={(v) => set("home.highlightsTitle", v)} max={100} />
            </div>
            <AreaField label="Text unter dem Titel" value={h.highlightsText} onChange={(v) => set("home.highlightsText", v)} max={400} rows={2} />
            <ListEditor items={h.highlights} onChange={(v) => set("home.highlights", v)} max={8} addLabel="Schritt / Vorteil hinzufügen"
              make={() => ({ title: "", text: "", icon: "check", imageUrl: null })}
              render={(x, put) => (
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                    <Select value={x.icon ?? "check"} onValueChange={(v) => put({ ...x, icon: v })}>
                      <SelectTrigger aria-label="Symbol"><SiteIcon name={x.icon} className="size-4" /><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ICONS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={x.title} onChange={(e) => put({ ...x, title: e.target.value })} placeholder="Titel (z. B. 1. Anfrage senden)" maxLength={60} aria-label="Titel" />
                  </div>
                  <textarea value={x.text ?? ""} onChange={(e) => put({ ...x, text: e.target.value })} placeholder="Beschreibung" maxLength={400} rows={2} aria-label="Beschreibung" className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                  <ImageField label="Bild (für die Scroll-Ansicht)" value={x.imageUrl} onChange={(v) => put({ ...x, imageUrl: v })} />
                </div>
              )} />
          </>
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label={`Bereich ${c.labels.itemPlural} (3D-Karussell)`} hint={`Die neuesten ${c.labels.itemPlural} (veröffentlicht).`} checked={h.showFeatured} onChange={(v) => set("home.showFeatured", v)} />
        {h.showFeatured && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Kleiner Text über dem Titel" value={h.featuredEyebrow} onChange={(v) => set("home.featuredEyebrow", v)} max={60} />
              <TextField className="sm:col-span-2" label="Titel des Bereichs" value={h.featuredTitle} onChange={(v) => set("home.featuredTitle", v)} max={100} />
            </div>
            <AreaField label="Text unter dem Titel" value={h.featuredText} onChange={(v) => set("home.featuredText", v)} max={400} rows={2} />
          </>
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="Kennzahlen mit animiertem Zähler" hint="Zahl eingeben (z. B. 48 oder 2.000+); beim Scrollen zählt sie von null hoch." checked={h.showStats ?? true} onChange={(v) => set("home.showStats", v)} />
        {(h.showStats ?? true) && (
          <ListEditor items={h.stats} onChange={(v) => set("home.stats", v)} max={6} addLabel="Kennzahl hinzufügen" make={() => ({ value: "", label: "" })}
            render={(x, put) => (
              <div className="grid grid-cols-2 gap-3">
                <Input value={x.value} onChange={(e) => put({ ...x, value: e.target.value })} placeholder="10+" maxLength={20} aria-label="Zahl" />
                <Input value={x.label} onChange={(e) => put({ ...x, label: e.target.value })} placeholder="Jahre Erfahrung" maxLength={40} aria-label="Bezeichnung" />
              </div>
            )} />
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="Leistungen auf der Startseite (Bento-Kacheln)" checked={h.showServices} onChange={(v) => set("home.showServices", v)} />
        {h.showServices && <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Kleiner Text über dem Titel" value={h.servicesEyebrow} onChange={(v) => set("home.servicesEyebrow", v)} max={60} />
              <TextField className="sm:col-span-2" label="Titel des Bereichs" value={h.servicesTitle} onChange={(v) => set("home.servicesTitle", v)} max={100} />
            </div>}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="Bereich „Über uns“" checked={h.showAbout} onChange={(v) => set("home.showAbout", v)} />
        {h.showAbout && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Titel" value={h.aboutTitle} onChange={(v) => set("home.aboutTitle", v)} max={80} />
            <ImageField label="Bild" value={h.aboutImageUrl} onChange={(v) => set("home.aboutImageUrl", v)} />
            <AreaField className="sm:col-span-2" label="Text" value={h.aboutText} onChange={(v) => set("home.aboutText", v)} max={3000} rows={5} />
          </div>
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="Häufige Fragen" checked={h.showFaq} onChange={(v) => set("home.showFaq", v)} />
        {h.showFaq && (
          <ListEditor items={h.faq} onChange={(v) => set("home.faq", v)} addLabel="Frage hinzufügen" make={() => ({ question: "", answer: "" })}
            render={(x, put) => (
              <>
                <Input value={x.question} onChange={(e) => put({ ...x, question: e.target.value })} placeholder="Frage" maxLength={160} aria-label="Frage" />
                <textarea value={x.answer} onChange={(e) => put({ ...x, answer: e.target.value })} placeholder="Antwort" maxLength={800} rows={2} aria-label="Antwort" className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
              </>
            )} />
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="Kontaktbox (unten auf der Seite)" checked={h.showCta} onChange={(v) => set("home.showCta", v)} />
        {h.showCta && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Titel" value={h.ctaTitle} onChange={(v) => set("home.ctaTitle", v)} max={80} />
            <TextField label="Text" value={h.ctaText} onChange={(v) => set("home.ctaText", v)} max={200} />
            <TextField label="Button-Text" value={h.ctaButtonText} onChange={(v) => set("home.ctaButtonText", v)} max={40} placeholder={c.labels.requestButton} />
            <TextField label="Button-Link" dir="ltr" value={h.ctaButtonUrl} onChange={(v) => set("home.ctaButtonUrl", v)} max={300} placeholder="/contact" />
          </div>
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="Laufband mit Partnern / Geschäftskunden" checked={h.showPartners ?? true} onChange={(v) => set("home.showPartners", v)} />
        {(h.showPartners ?? true) && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Kleiner Text über dem Titel" value={h.partnersEyebrow} onChange={(v) => set("home.partnersEyebrow", v)} max={60} />
              <TextField className="sm:col-span-2" label="Titel des Bereichs" value={h.partnersTitle} onChange={(v) => set("home.partnersTitle", v)} max={100} />
            </div>
            <ListEditor items={h.partners ?? []} onChange={(v) => set("home.partners", v)} max={20} addLabel="Namen hinzufügen" make={() => ""}
              render={(x, put) => <Input value={x} onChange={(e) => put(e.target.value)} placeholder="Name der Organisation oder Marke" maxLength={80} aria-label="Name" />} />
          </>
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="Kundenstimmen (laufende Spalten)" hint="Nur echte Meinungen mit Zustimmung der Kunden veröffentlichen." checked={h.showTestimonials ?? true} onChange={(v) => set("home.showTestimonials", v)} />
        {(h.showTestimonials ?? true) && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Kleiner Text über dem Titel" value={h.testimonialsEyebrow} onChange={(v) => set("home.testimonialsEyebrow", v)} max={60} />
              <TextField className="sm:col-span-2" label="Titel des Bereichs" value={h.testimonialsTitle} onChange={(v) => set("home.testimonialsTitle", v)} max={100} />
            </div>
            <AreaField label="Text unter dem Titel" value={h.testimonialsText} onChange={(v) => set("home.testimonialsText", v)} max={300} rows={2} />
            <ListEditor items={h.testimonials ?? []} onChange={(v) => set("home.testimonials", v)} max={20} addLabel="Stimme hinzufügen" make={() => ({ name: "", role: "", text: "" })}
              render={(x, put) => (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={x.name} onChange={(e) => put({ ...x, name: e.target.value })} placeholder="Name" maxLength={60} aria-label="Name" />
                    <Input value={x.role ?? ""} onChange={(e) => put({ ...x, role: e.target.value })} placeholder="Leistung / Position" maxLength={60} aria-label="Kurzbeschreibung" />
                  </div>
                  <textarea value={x.text} onChange={(e) => put({ ...x, text: e.target.value })} placeholder="Text der Kundenstimme" maxLength={500} rows={2} aria-label="Text der Kundenstimme" className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                </>
              )} />
          </>
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="Zoom-Galerie (unten auf der Seite)" hint="Bis zu 7 Bilder; das erste steht groß in der Mitte und wächst beim Scrollen." checked={h.showGallery ?? true} onChange={(v) => set("home.showGallery", v)} />
        {(h.showGallery ?? true) && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Kleiner Text über dem Titel" value={h.galleryEyebrow} onChange={(v) => set("home.galleryEyebrow", v)} max={60} />
              <TextField className="sm:col-span-2" label="Titel des Bereichs" value={h.galleryTitle} onChange={(v) => set("home.galleryTitle", v)} max={100} />
            </div>
            <ImagesField value={h.gallery ?? []} onChange={(v) => set("home.gallery", v.slice(0, 7))} />
          </>
        )}
      </section>
    </div>
  );
}

export function MenuSection({ c, set }: P) {
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <p className="text-sm font-medium">Links im oberen Menü</p>
        <ListEditor items={c.nav} onChange={(v) => set("nav", v)} max={10} addLabel="Link hinzufügen" make={(): NavLink => ({ label: "", href: "/" })}
          render={(x, put) => (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input value={x.label} onChange={(e) => put({ ...x, label: e.target.value })} placeholder="Titel" maxLength={30} aria-label="Linktitel" />
                <Input dir="ltr" value={x.href} onChange={(e) => put({ ...x, href: e.target.value })} placeholder="/items" maxLength={300} aria-label="Linkadresse" />
              </div>
              <details className="rounded-lg border border-dashed border-border p-3" open={(x.children?.length ?? 0) > 0}>
                <summary className="cursor-pointer text-sm font-medium">Untermenü (großes Menü mit Bild) {(x.children?.length ?? 0) > 0 ? `· ${x.children!.length} Link` : ""}</summary>
                <div className="mt-3 grid gap-3">
                  <ListEditor items={x.children ?? []} onChange={(v) => put({ ...x, children: v })} max={12} addLabel="Unterlink hinzufügen" make={(): NavLink => ({ label: "", href: "/", group: "", badge: "" })}
                    render={(y, putY) => (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input value={y.label} onChange={(e) => putY({ ...y, label: e.target.value })} placeholder="Titel" maxLength={40} aria-label="Titel des Unterlinks" />
                        <Input dir="ltr" value={y.href} onChange={(e) => putY({ ...y, href: e.target.value })} placeholder="/items?…" maxLength={300} aria-label="Adresse des Unterlinks" />
                        <Input value={y.group ?? ""} onChange={(e) => putY({ ...y, group: e.target.value })} placeholder="Spalte (z. B. „Highlights“)" maxLength={30} aria-label="Spalte" />
                        <Input value={y.badge ?? ""} onChange={(e) => putY({ ...y, badge: e.target.value })} placeholder="Kleines Etikett (optional)" maxLength={20} aria-label="Etikett" />
                      </div>
                    )} />
                  {(x.children?.length ?? 0) > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ImageField label="Bild neben dem Menü" value={x.imageUrl} onChange={(v) => put({ ...x, imageUrl: v })} />
                      <div className="grid gap-3">
                        <Input value={x.caption ?? ""} onChange={(e) => put({ ...x, caption: e.target.value })} placeholder="Text auf dem Bild" maxLength={60} aria-label="Text auf dem Bild" />
                        <Input value={x.note ?? ""} onChange={(e) => put({ ...x, note: e.target.value })} placeholder="Hinweis unten im Menü" maxLength={100} aria-label="Hinweis unten im Menü" />
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </>
          )} />
        <p className="text-xs text-muted-foreground">Interne Adressen: / Start · /items {c.labels.itemPlural} · /services Leistungen · /contact Kontakt · /#about Über uns</p>
      </section>
      <section className="grid gap-3">
        <p className="text-sm font-medium">Aktive Seiten</p>
        <SwitchRow label={`Seite ${c.labels.itemPlural}`} checked={c.pages.items} onChange={(v) => set("pages.items", v)} />
        <SwitchRow label="Seite „Leistungen und Preise“" checked={c.pages.services} onChange={(v) => set("pages.services", v)} />
        <SwitchRow label="Kontaktseite mit Anfrageformular" checked={c.pages.contact} onChange={(v) => set("pages.contact", v)} />
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <AreaField className="sm:col-span-2" label="Footer-Text" value={c.footer.text} onChange={(v) => set("footer.text", v)} max={300} rows={2} />
        <TextField label="Copyright-Text" value={c.footer.copyright} onChange={(v) => set("footer.copyright", v)} max={120} placeholder={`© ${c.brand.name}`} />
        <TextField label="Titel der Website bei Google" value={c.seo.title} onChange={(v) => set("seo.title", v)} max={70} placeholder={c.brand.name} />
        <AreaField className="sm:col-span-2" label="Beschreibung der Website bei Google" value={c.seo.description} onChange={(v) => set("seo.description", v)} max={160} rows={2} />
      </section>
    </div>
  );
}

export function CatalogSection({ c, set }: P) {
  const L = c.labels;
  return (
    <div className="grid gap-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <TextField label="Bezeichnung eines Eintrags (Einzahl)" value={L.itemSingular} onChange={(v) => set("labels.itemSingular", v)} max={30} placeholder="Reise / Fahrzeug / Produkt" />
        <TextField label="Mehrzahl" value={L.itemPlural} onChange={(v) => set("labels.itemPlural", v)} max={30} placeholder="Reisen" />
        <TextField label="Titel der Listenseite" value={L.itemsPageTitle} onChange={(v) => set("labels.itemsPageTitle", v)} max={60} />
        <TextField label="Text des Anfrage-Buttons" value={L.requestButton} onChange={(v) => set("labels.requestButton", v)} max={30} placeholder="Reise buchen" />
        <TextField label="Etikett „Nicht verfügbar“" value={L.soldOutLabel} onChange={(v) => set("labels.soldOutLabel", v)} max={30} placeholder="Ausgebucht" />
        <TextField label="Titel der Leistungsseite" value={L.servicesTitle} onChange={(v) => set("labels.servicesTitle", v)} max={60} />
      </section>
      <section className="grid gap-3">
        <p className="text-sm font-medium">Kategorien <span className="text-xs text-muted-foreground">(werden oben auf der Listenseite als Buttons angezeigt)</span></p>
        <ListEditor items={c.categories} onChange={(v) => set("categories", v)} max={30} addLabel="Kategorie hinzufügen" make={() => ""}
          render={(x, put) => <Input value={x} onChange={(e) => put(e.target.value)} placeholder="z. B. Fernreise" maxLength={60} aria-label="Name der Kategorie" />} />
      </section>
      <section className="grid gap-3">
        <p className="text-sm font-medium">Eigene Felder pro Eintrag</p>
        <p className="text-xs text-muted-foreground">Zum Beispiel bei Reisen: Ziel, Dauer, Hotel. Bei Autos: Baujahr, Kilometerstand. Ein „Auswahlfeld“ kann auch als Filter auf der Listenseite dienen.</p>
        <ListEditor items={c.fields} onChange={(v) => set("fields", v)} max={12} addLabel="Feld hinzufügen"
          make={(): FieldDef => ({ key: `f${c.fields.length + 1}`, label: "", type: "text", options: [], suffix: null, showOnCard: false, filter: false })}
          render={(f, put) => (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
                <Input value={f.label} onChange={(e) => put({ ...f, label: e.target.value })} placeholder="Feldtitel (z. B. Ziel)" maxLength={40} aria-label="Feldtitel" />
                <Select value={f.type} onValueChange={(v) => put({ ...f, type: v as FieldDef["type"] })}>
                  <SelectTrigger aria-label="Feldtyp"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="number">Zahl</SelectItem><SelectItem value="select">Auswahl</SelectItem></SelectContent>
                </Select>
                <Input dir="ltr" value={f.key} onChange={(e) => put({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30) })} placeholder="key" aria-label="Technischer Schlüssel (Englisch)" title="Technischer Schlüssel; nach dem Anlegen von Einträgen nicht mehr ändern" />
              </div>
              {f.type === "select" && (
                <Input value={f.options.join(",  ")} onChange={(e) => put({ ...f, options: e.target.value.split(/[, ,]/).map((o) => o.trim()).filter(Boolean) })} placeholder="Optionen mit Komma: Flug, Bus/Bahn" aria-label="Optionen" />
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {f.type === "number" && <Input className="h-9 w-40" value={f.suffix ?? ""} onChange={(e) => put({ ...f, suffix: e.target.value || null })} placeholder="Einheit (km)" aria-label="Einheit" />}
                <label className="flex items-center gap-2"><input type="checkbox" checked={f.showOnCard} onChange={(e) => put({ ...f, showOnCard: e.target.checked })} />Auf der Karte anzeigen</label>
                {f.type === "select" && <label className="flex items-center gap-2"><input type="checkbox" checked={f.filter} onChange={(e) => put({ ...f, filter: e.target.checked })} />Filter auf der Listenseite</label>}
              </div>
            </>
          )} />
      </section>
    </div>
  );
}

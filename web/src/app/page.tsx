import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { MaskedTextReveal } from "@/components/ui/text-reveal-mask";
import CTA from "@/components/ui/cta-06";
import ListingCard from "@/components/site/listing-card";
import HeroMedia from "@/components/site/hero-media";
import { SiteIcon } from "@/components/site/icon";
import { Button } from "@/components/ui/button";
import { getListings, getServices, mediaUrl } from "@/lib/api";
import { getSite } from "@/lib/site";
import { servicePrice } from "@/lib/services";

export const dynamic = "force-dynamic";

function SectionTitle({ eyebrow, title, text }: { eyebrow?: string | null; title: string; text?: string | null }) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      {eyebrow && <p className="mb-3 text-sm font-semibold text-primary">{eyebrow}</p>}
      <MaskedTextReveal as="h2" text={title} splitBy="words" className="text-3xl font-black leading-tight md:text-5xl" />
      {text && <p className="mt-4 text-lg text-muted-foreground">{text}</p>}
    </div>
  );
}

export default async function Home() {
  const site = await getSite();
  const c = site.content;
  const h = c.home;
  const [featured, services] = await Promise.all([
    h.showFeatured && c.pages.items ? getListings("featured=true&pageSize=6") : null,
    h.showServices && c.pages.services ? getServices() : null,
  ]);
  const featuredItems = featured?.items.length ? featured.items : (await getListings("pageSize=6"))?.items ?? [];
  const topServices = (services ?? []).sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, 3);
  const heroImage = mediaUrl(h.heroImageUrl);
  const isEmpty = !h.heroTitle && !c.brand.name;

  return (
    <>
      {/* Hero */}
      <section aria-label={c.brand.name} className="relative isolate flex min-h-[88vh] items-end overflow-hidden px-4 pb-20 pt-40 md:items-center md:pb-24">
        <HeroMedia image={heroImage} video={mediaUrl(h.heroVideoUrl)} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            {c.brand.tagline && <p className="mb-4 text-sm font-semibold tracking-wide text-primary">{c.brand.tagline}</p>}
            <h1 className="text-4xl font-black leading-tight md:text-7xl">{h.heroTitle || c.brand.name || "سایت شما اینجاست"}</h1>
            {h.heroSubtitle && <p className="mt-6 max-w-2xl text-lg text-foreground/85 md:text-2xl">{h.heroSubtitle}</p>}
            <div className="mt-10 flex flex-wrap gap-3">
              {h.heroCtaText && h.heroCtaUrl && (
                <Button asChild size="lg" className="h-12 px-6 text-base font-bold">
                  <Link href={h.heroCtaUrl}>{h.heroCtaText}<ArrowLeft className="size-4" aria-hidden /></Link>
                </Button>
              )}
              {c.pages.contact && (
                <Button asChild size="lg" variant="outline" className="h-12 bg-background/60 px-6 text-base font-bold backdrop-blur">
                  <Link href="/contact">{c.labels.requestButton}</Link>
                </Button>
              )}
            </div>
            {isEmpty && <p className="mt-8 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">این صفحه هنوز خالی است. از پنل مدیریت، دستیار راه‌اندازی را دنبال کنید.</p>}
          </div>
        </div>
      </section>

      {/* Highlights */}
      {h.showHighlights && h.highlights.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-24">
          {h.highlightsTitle && <SectionTitle title={h.highlightsTitle} />}
          <ul className={`grid gap-5 sm:grid-cols-2 ${h.highlights.length % 4 === 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {h.highlights.map((x) => (
              <li key={x.title} className="rounded-[var(--radius)] border border-border bg-card p-6">
                <span className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary"><SiteIcon name={x.icon} className="size-6" /></span>
                <h3 className="mt-5 text-xl font-bold">{x.title}</h3>
                {x.text && <p className="mt-2 text-muted-foreground">{x.text}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Featured listings */}
      {h.showFeatured && c.pages.items && featuredItems.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-24">
          <SectionTitle eyebrow={c.labels.itemPlural} title={h.featuredTitle || c.labels.itemsPageTitle} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredItems.map((l) => <ListingCard key={l.id} item={l} site={c} />)}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="outline" size="lg"><Link href="/items">{`همه‌ی ${c.labels.itemPlural}`}</Link></Button>
          </div>
        </section>
      )}

      {/* Services preview */}
      {topServices.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-24">
          <SectionTitle eyebrow="خدمات" title={c.labels.servicesTitle} />
          <div className="grid gap-5 md:grid-cols-3">
            {topServices.map((s) => (
              <div key={s.id} className={`flex flex-col rounded-[var(--radius)] border bg-card p-6 ${s.isFeatured ? "border-primary/60" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold">{s.title}</h3>
                  {s.badge && <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">{s.badge}</span>}
                </div>
                <p className="mt-3 text-2xl font-black text-primary">{servicePrice(s)}</p>
                {s.description && <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>}
                <ul className="mt-4 space-y-2 text-sm">
                  {s.features.slice(0, 3).map((f) => <li key={f} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center"><Button asChild variant="outline" size="lg"><Link href="/services">همه‌ی خدمات و قیمت‌ها</Link></Button></div>
        </section>
      )}

      {/* About + stats */}
      {h.showAbout && (h.aboutText || h.stats.length > 0) && (
        <section id="about" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-24 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-primary">{c.brand.name}</p>
            <h2 className="text-3xl font-black md:text-5xl">{h.aboutTitle || "درباره‌ی ما"}</h2>
            {h.aboutText && <p className="mt-6 whitespace-pre-line text-lg leading-8 text-muted-foreground">{h.aboutText}</p>}
            {h.stats.length > 0 && (
              <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {h.stats.map((s) => (
                  <div key={s.label} className="rounded-[var(--radius)] border border-border bg-card p-4">
                    <dt className="text-sm text-muted-foreground">{s.label}</dt>
                    <dd className="mt-1 text-2xl font-black text-primary">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {h.aboutImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(h.aboutImageUrl)} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[var(--radius)] object-cover" />
          )}
        </section>
      )}

      {/* FAQ */}
      {h.showFaq && h.faq.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-24">
          <SectionTitle title="پرسش‌های متداول" />
          <div className="space-y-3">
            {h.faq.map((f) => (
              <details key={f.question} className="group rounded-[var(--radius)] border border-border bg-card p-5 open:border-primary/50">
                <summary className="cursor-pointer list-none text-lg font-bold marker:hidden">
                  <span className="flex items-center justify-between gap-4">{f.question}<span className="text-primary transition-transform group-open:rotate-45" aria-hidden>+</span></span>
                </summary>
                <p className="mt-3 leading-8 text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {h.showCta && c.pages.contact && (
        <CTA title={h.ctaTitle ?? "سؤالی دارید؟"} description={h.ctaText ?? ""} primaryText={c.labels.requestButton} primaryHref="/contact"
          secondaryText={c.contact.phone ? "تماس تلفنی" : `دیدن ${c.labels.itemPlural}`} secondaryHref={c.contact.phone ? `tel:${c.contact.phone}` : "/items"} />
      )}
    </>
  );
}

import Link from "next/link";
import { BadgeCheck, Car, FileCheck2, Handshake, ShieldCheck, Sparkles, Star, Ticket, Timer } from "lucide-react";
import HeroVideo from "@/components/site/hero-video";
import { MaskedTextReveal } from "@/components/ui/text-reveal-mask";
import Scroll01 from "@/components/ui/scroll-01";
import CoverFlowCarousel from "@/components/ui/3-d-coverflow-carousel";
import { CountUp } from "@/components/ui/count-up";
import { BentoGrid } from "@/components/ui/bento-grid";
import LogoMarquee from "@/components/ui/logo-marquee";
import CTA from "@/components/ui/cta-06";
import VerticalMarqueeDemo, { type Review } from "@/components/ui/marquee-03";
import { ZoomParallax } from "@/components/ui/zoom-parallax";
import { SiteIcon } from "@/components/site/icon";
import { Button } from "@/components/ui/button";
import { getListings, getServices, mediaUrl } from "@/lib/api";
import { fieldValue, getSite, priceText, videoVariants } from "@/lib/site";

export const dynamic = "force-dynamic"; // content and inventory are edited live from the panel

const faDigits = (n: number) => new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(n);

/** Neutral initials avatar — reviews never use real people's faces. */
const avatar = (text: string, color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#1c1c1f"/><text x="40" y="50" font-size="28" font-family="sans-serif" fill="${color}" text-anchor="middle">${text}</text></svg>`,
  )}`;

/** "۴۸ ساعت" / "2,000+" → animated number + the text around it. Values without a number stay text. */
function parseStat(value: string) {
  const latin = value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const m = latin.match(/^(\D*?)(\d[\d,٬]*)(.*)$/);
  if (!m) return null;
  const n = Number(m[2].replace(/[,٬]/g, ""));
  return Number.isFinite(n) ? { prefix: m[1], to: n, suffix: m[3] } : null;
}

const BENTO_ICONS = [Car, Handshake, Timer, Ticket, Sparkles, FileCheck2, ShieldCheck, Star];
const BENTO_SPANS = [2, 1, 1, 1, 2, 1, 2, 1];

function SectionTitle({ eyebrow, title, text }: { eyebrow?: string | null; title: string; text?: string | null }) {
  return (
    <div className="mx-auto mb-12 max-w-3xl px-6 text-center">
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
  const [items, services] = await Promise.all([
    h.showFeatured && c.pages.items ? getListings("pageSize=12") : null,
    h.showServices && c.pages.services ? getServices() : null,
  ]);
  const listings = items?.items ?? [];
  const bento = (services ?? []).slice().sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder).slice(0, 7);
  const highlights = h.highlights ?? [];
  const storySteps = highlights.length > 0 && highlights.every((x) => x.imageUrl);
  const partners = h.partners ?? [];
  const testimonials = h.testimonials ?? [];
  const gallery = (h.gallery ?? []).filter(Boolean);
  const stats = h.stats ?? [];
  const isEmpty = !h.heroTitle && !c.brand.name;

  const video = videoVariants(h.heroVideoUrl, h.heroVideoOptimized);
  const raw = mediaUrl(h.heroVideoUrl);
  const poster = mediaUrl(video?.poster ?? h.heroImageUrl);
  const still = mediaUrl(video?.still ?? h.heroImageUrl);

  const reviews: Review[] = testimonials.map((t, i) => ({
    name: t.name,
    username: t.role ?? "",
    body: t.text,
    profile: avatar(faDigits(i + 1), c.theme.primary),
  }));

  return (
    <>
      {/* Hero: scroll scrubs the video forward/backward (sticky, the page keeps scrolling after it) */}
      <section aria-label={c.brand.name || "صفحه‌ی اصلی"} className="relative">
        <HeroVideo
          src1080={video ? mediaUrl(video.scrub) : raw}
          src720={video ? mediaUrl(video.scrub720) : raw}
          poster={poster}
          still={still}
          mode={h.heroVideoMode === "loop" ? "loop" : "scroll"}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="sticky top-0 flex h-screen flex-col items-center justify-center bg-gradient-to-b from-background/40 via-transparent to-background px-6 text-center">
            {(h.heroEyebrow || c.brand.tagline) && <p className="mb-4 text-sm font-semibold tracking-wide text-primary">{h.heroEyebrow || c.brand.tagline}</p>}
            <MaskedTextReveal as="h1" text={h.heroTitle || c.brand.name || "سایت شما اینجاست"} splitBy="words" className="text-6xl font-black md:text-8xl" />
            {h.heroSubtitle && (
              <MaskedTextReveal as="p" text={h.heroSubtitle} splitBy="words" delay={0.5} className="mt-6 text-xl text-foreground/85 md:text-2xl" />
            )}
            {h.heroCtaText && h.heroCtaUrl && (
              <Button asChild size="lg" className="pointer-events-auto mt-10 h-12 px-6 text-base font-bold">
                <Link href={h.heroCtaUrl}>{h.heroCtaText}</Link>
              </Button>
            )}
            {isEmpty && (
              <p className="pointer-events-auto mt-8 rounded-xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                این صفحه هنوز خالی است. از پنل مدیریت، دستیار راه‌اندازی را دنبال کنید.
              </p>
            )}
            <span className="absolute bottom-10 text-xs text-muted-foreground">اسکرول کنید ↓</span>
          </div>
        </div>
      </section>

      {/* Steps / highlights — sticky scroll story when every step has a photo */}
      {h.showHighlights && highlights.length > 0 && (
        <section id="highlights" className="mx-auto max-w-6xl px-6 py-28">
          {h.highlightsTitle && <SectionTitle eyebrow={h.highlightsEyebrow} title={h.highlightsTitle} text={h.highlightsText} />}
          {storySteps ? (
            <Scroll01 items={highlights.map((x) => ({ title: x.title, description: x.text ?? "", media: mediaUrl(x.imageUrl) }))} />
          ) : (
            <ul className={`grid gap-5 sm:grid-cols-2 ${highlights.length % 4 === 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
              {highlights.map((x) => (
                <li key={x.title} className="rounded-[var(--radius)] border border-border bg-card p-6">
                  <span className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary"><SiteIcon name={x.icon} className="size-6" /></span>
                  <h3 className="mt-5 text-xl font-bold">{x.title}</h3>
                  {x.text && <p className="mt-2 text-muted-foreground">{x.text}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Inventory — 3D cover-flow */}
      {h.showFeatured && c.pages.items && listings.length > 0 && (
        <section id="items" className="py-20">
          <SectionTitle eyebrow={h.featuredEyebrow ?? c.labels.itemPlural} title={h.featuredTitle || c.labels.itemsPageTitle} text={h.featuredText} />
          <CoverFlowCarousel
            sectionLabel={c.brand.name}
            autoplay
            autoplayDelay={4500}
            items={listings.map((l) => ({
              tag: l.category ? `#${l.category}` : l.badge ? `#${l.badge}` : undefined,
              titleLine1: l.title,
              titleLine2: priceText(l),
              desc: c.fields.filter((f) => f.showOnCard).map((f) => fieldValue(f, l.attributes[f.key])).filter(Boolean).join(" · ") || l.summary || undefined,
              img: mediaUrl(l.images[0]),
              ctaText: `مشاهده‌ی ${c.labels.itemSingular}`,
              ctaUrl: `/items/${encodeURIComponent(l.slug)}`,
            }))}
          />
        </section>
      )}

      {/* Numbers */}
      {(h.showStats ?? true) && stats.length > 0 && (
        <section className={`mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-16 text-center ${stats.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {stats.map((s) => {
            const p = parseStat(s.value);
            return (
              <div key={s.label}>
                <div dir="ltr" className="text-4xl font-black text-primary md:text-5xl">
                  {p ? <>{p.prefix}<CountUp to={p.to} separator="," />{p.suffix}</> : s.value}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </section>
      )}

      {/* Services — bento grid */}
      {bento.length > 0 && (
        <section id="services" className="py-20">
          <SectionTitle eyebrow={h.servicesEyebrow ?? "خدمات ما"} title={h.servicesTitle || c.labels.servicesTitle} />
          <BentoGrid
            items={bento.map((s, i) => {
              const Icon = BENTO_ICONS[i % BENTO_ICONS.length];
              return {
                title: s.title,
                meta: s.category ?? undefined,
                description: s.description ?? "",
                icon: <Icon className="h-4 w-4 text-primary" />,
                status: s.badge ?? undefined,
                tags: s.features.slice(0, 2),
                colSpan: BENTO_SPANS[i],
                hasPersistentHover: i === 0,
              };
            })}
          />
          <div className="mt-10 text-center"><Button asChild variant="outline" size="lg"><Link href="/services">{c.labels.servicesTitle}</Link></Button></div>
        </section>
      )}

      {/* About */}
      {h.showAbout && (h.aboutText || h.aboutImageUrl) && (
        <section id="about" className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-primary">{c.brand.name}</p>
            <MaskedTextReveal as="h2" text={h.aboutTitle || "درباره‌ی ما"} splitBy="words" className="text-3xl font-black md:text-5xl" />
            {h.aboutText && <p className="mt-6 whitespace-pre-line text-lg leading-8 text-muted-foreground">{h.aboutText}</p>}
          </div>
          {h.aboutImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(h.aboutImageUrl)} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[var(--radius)] object-cover" />
          )}
        </section>
      )}

      {/* Partners — moving logo strip */}
      {(h.showPartners ?? true) && partners.length > 0 && (
        <section id="partners" className="py-16">
          {h.partnersTitle && <SectionTitle eyebrow={h.partnersEyebrow} title={h.partnersTitle} />}
          <LogoMarquee
            label={h.partnersTitle ?? "همکاران"}
            speed={36}
            gap={56}
            items={partners.map((o, i) => ({
              id: String(i),
              label: o,
              mark: (
                <span className="flex items-center gap-2 whitespace-nowrap text-lg font-bold text-foreground/80">
                  <BadgeCheck className="h-5 w-5 text-primary" /> {o}
                </span>
              ),
            }))}
          />
        </section>
      )}

      {/* Call to action */}
      {h.showCta && c.pages.contact && (
        <CTA
          title={h.ctaTitle ?? "سؤالی دارید؟"}
          description={h.ctaText ?? ""}
          primaryText={h.ctaButtonText || c.labels.requestButton}
          primaryHref={h.ctaButtonUrl || "/contact"}
          secondaryText={c.contact.phone ? `تماس: ${c.contact.phone.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}` : `دیدن ${c.labels.itemPlural}`}
          secondaryHref={c.contact.phone ? `tel:${c.contact.phone}` : "/items"}
        />
      )}

      {/* Testimonials — vertical marquee */}
      {(h.showTestimonials ?? true) && reviews.length > 0 && (
        <section id="reviews" className="py-20">
          <SectionTitle eyebrow={h.testimonialsEyebrow ?? "نظر مشتری‌ها"} title={h.testimonialsTitle || "صدای مشتری‌ها"} text={h.testimonialsText} />
          <VerticalMarqueeDemo reviews={reviews} />
        </section>
      )}

      {/* FAQ */}
      {h.showFaq && h.faq.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-24">
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

      {/* Gallery — zoom parallax */}
      {(h.showGallery ?? true) && gallery.length > 0 && (
        <section aria-label={h.galleryTitle ?? "گالری"} className="relative">
          {(h.galleryTitle || h.galleryEyebrow) && (
            <div className="pointer-events-none absolute inset-x-0 top-24 z-10 px-6 text-center">
              {h.galleryEyebrow && <p className="text-sm font-semibold text-primary">{h.galleryEyebrow}</p>}
              {h.galleryTitle && <h2 className="mt-2 text-3xl font-black md:text-5xl">{h.galleryTitle}</h2>}
            </div>
          )}
          <ZoomParallax images={gallery.map((src, i) => ({ src: mediaUrl(src), alt: `${h.galleryTitle ?? "گالری"} ${faDigits(i + 1)}` }))} />
        </section>
      )}
    </>
  );
}

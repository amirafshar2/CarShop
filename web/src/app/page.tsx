import { BadgeCheck, Car, FileCheck2, Handshake, ShieldCheck, Sparkles, Ticket, Timer } from "lucide-react";
import HeroVideo from "./hero-video";
import { MaskedTextReveal } from "@/components/ui/text-reveal-mask";
import Scroll01 from "@/components/ui/scroll-01";
import CoverFlowCarousel from "@/components/ui/3-d-coverflow-carousel";
import { CountUp } from "@/components/ui/count-up";
import { BentoGrid } from "@/components/ui/bento-grid";
import LogoMarquee from "@/components/ui/logo-marquee";
import CTA from "@/components/ui/cta-06";
import VerticalMarqueeDemo, { type Review } from "@/components/ui/marquee-03";
import { ZoomParallax } from "@/components/ui/zoom-parallax";
import { coverOf, getCars } from "@/lib/api";
import { HERO_VIDEO, PHOTOS, unsplash } from "@/lib/media";
import { fa, faNum, km, listingLabels, toman } from "@/lib/format";

export const dynamic = "force-dynamic"; // live inventory (the API caches and invalidates itself)

/** Neutral initials avatar — demo reviews must never use real people's faces. */
const initials = (text: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#1c1c1f"/><text x="40" y="50" font-size="28" font-family="sans-serif" fill="#f26a1b" text-anchor="middle">${text}</text></svg>`,
  )}`;

// متن نمونه — در نسخه‌ی نهایی، نظرات واقعی مشتریان از پنل ادمین (بعد از تأیید) نمایش داده می‌شود.
const sampleReviews: Review[] = [
  { name: "متن نمونه", username: "خرید از راه دور", body: "«اینجا نظر واقعی مشتری بعد از تحویل خودرو نمایش داده می‌شود.»", profile: initials("۱") },
  { name: "متن نمونه", username: "فروش بدون کمیسیون", body: "«ادمین نظرات را تأیید می‌کند و فقط نظرات واقعی منتشر می‌شوند.»", profile: initials("۲") },
  { name: "متن نمونه", username: "دیتیلینگ", body: "«ویدیوهای هایلایت رضایت مشتری هم از پنل ادمین اضافه می‌شود.»", profile: initials("۳") },
  { name: "متن نمونه", username: "گذر موقت", body: "«امتیاز و متن کوتاه مشتری، همراه با نام خودروی خریداری‌شده.»", profile: initials("۴") },
  { name: "متن نمونه", username: "حواله", body: "«نمایش خودکار به‌صورت ستون‌های متحرک، با توقف روی هاور.»", profile: initials("۵") },
  { name: "متن نمونه", username: "تعویض پلاک", body: "«هر نظر به سفارش واقعی همان مشتری متصل است.»", profile: initials("۶") },
];

const organizations = ["بانک سپه منطقه فارس", "کانون بازنشستگان ارتش استان فارس", "کانون بازنشستگان شرکت نفت استان فارس", "علوم پزشکی استان فارس"];

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-3xl px-6 text-center">
      <p className="mb-3 text-sm font-semibold text-primary">{eyebrow}</p>
      <MaskedTextReveal as="h2" text={title} splitBy="words" className="text-3xl font-black leading-tight md:text-5xl" />
      {text && <p className="mt-4 text-lg text-muted-foreground">{text}</p>}
    </div>
  );
}

export default async function Home() {
  const data = await getCars("pageSize=12&sort=newest");
  const cars = data?.items ?? [];

  return (
    <>
      {/* Hero: scroll scrubs the video forward/backward (sticky, the page keeps scrolling after it) */}
      <section aria-label="مروجی موتورز" className="relative">
        <HeroVideo desktop={HERO_VIDEO.desktop} mid={HERO_VIDEO.mid} poster={HERO_VIDEO.poster || unsplash(PHOTOS.mustangDark, 1920)} still={HERO_VIDEO.still || unsplash(PHOTOS.mustangDark, 960)} />
        <div className="pointer-events-none absolute inset-0">
          <div className="sticky top-0 flex h-screen flex-col items-center justify-center bg-gradient-to-b from-background/40 via-transparent to-background px-6 text-center">
            <p className="mb-4 text-sm font-semibold tracking-wide text-primary">مشاور خرید و فروش خودرو · شیراز</p>
            <MaskedTextReveal as="h1" text="مروجی موتورز" splitBy="words" className="text-6xl font-black md:text-8xl" />
            <MaskedTextReveal as="p" text="از انتخاب تا تعویض پلاک — بدون نیاز به حضور شما" splitBy="words" delay={0.5} className="mt-6 text-xl text-foreground/85 md:text-2xl" />
            <span className="absolute bottom-10 text-xs text-muted-foreground">اسکرول کنید ↓</span>
          </div>
        </div>
      </section>

      {/* خرید از راه دور — مزیت اصلی */}
      <section id="remote-buy" className="mx-auto max-w-6xl px-6 py-28">
        <SectionTitle
          eyebrow="خرید از راه دور"
          title="بدون حضور، ماشین دلخواهت رو بخر"
          text="در پروسه‌ی خرید خودرو هیچ نیازی به حضور شما نیست. تیم مروجی موتورز برای شما دنبال ماشین می‌گردد."
        />
        <Scroll01
          items={[
            { title: "۱. ماشین دلخواهت رو بگو", description: "برند، مدل، بودجه و شرایط رو ثبت کن؛ یک کارشناس اختصاصی برات تعیین می‌شه.", media: unsplash(PHOTOS.mercedesGarage) },
            { title: "۲. عکس و فیلم هر بازدید", description: "از تمام بازدیدها برات عکس و فیلم می‌فرستیم تا به گزینه‌ی دلخواهت برسی — همه داخل پروفایلت.", media: unsplash(PHOTOS.bmwSeven) },
            { title: "۳. کارشناسی و گواهی کتبی", description: "بعد از تأیید اولیه‌ی تو، خودرو توسط مجرب‌ترین کارشناس‌ها در زمینه‌ی رنگ و فنی بررسی و گواهی کتبی صادر می‌شه. کارشناس خودت رو هم می‌تونی معرفی کنی.", media: unsplash(PHOTOS.audi) },
            { title: "۴. قرارداد، تعویض پلاک، تحویل", description: "قرارداد شفاف، پیگیری مرحله‌به‌مرحله تا تعویض پلاک و تحویل خودرو.", media: unsplash(PHOTOS.rangeRoverGarage) },
          ]}
        />
      </section>

      {/* موجودی امروز */}
      <section className="py-20">
        <SectionTitle eyebrow="موجودی امروز" title="هر روز به‌روز، همیشه در دسترس" text="به جای استوری‌ای که ۲۴ ساعته پاک می‌شه — موجودی دائمی، قابل جستجو و قابل اشتراک." />
        {cars.length > 0 ? (
          <CoverFlowCarousel
            sectionLabel="مروجی موتورز"
            autoplay
            autoplayDelay={4500}
            items={cars.map((c) => ({
              tag: `#${listingLabels[c.listingType]}`,
              titleLine1: c.titleFa,
              titleLine2: c.priceOnCall ? "قیمت تماس" : toman(c.priceRial),
              desc: `مدل ${faNum(c.modelYear)} · ${km(c.mileageKm)}${c.colors ? ` · ${c.colors.replaceAll(",", "، ")}` : ""}`,
              img: coverOf(c, 1400),
              ctaText: "مشاهده‌ی خودرو",
              ctaUrl: `/cars/${c.slug}`,
            }))}
          />
        ) : (
          <p className="text-center text-muted-foreground">برای نمایش موجودی، API را اجرا کنید (README).</p>
        )}
      </section>

      {/* اعداد واقعی */}
      <section className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-16 text-center md:grid-cols-4">
        {[
          { to: data?.totalCount ?? 0, label: "خودرو در موجودی" },
          { to: 4, label: "سازمان طرف قرارداد" },
          { to: 48, label: "ساعت رزرو با بیعانه" },
          { to: 2000, label: "دنبال‌کننده‌ی اینستاگرام" },
        ].map((s) => (
          <div key={s.label}>
            <div dir="ltr" className="text-4xl font-black text-primary md:text-5xl">
              <CountUp to={s.to} separator="," />
              {s.to >= 2000 ? "+" : ""}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      {/* خدمات */}
      <section id="services" className="py-20">
        <SectionTitle eyebrow="خدمات ما" title="صفر تا صد خرید و فروش خودرو" />
        <BentoGrid
          items={[
            { title: "خرید از راه دور", meta: "بدون حضور", description: "جستجو، بازدید تصویری، کارشناسی و گواهی کتبی — همه آنلاین.", icon: <Car className="h-4 w-4 text-primary" />, status: "ویژه", tags: ["عکس و فیلم", "گواهی کارشناسی"], colSpan: 2, hasPersistentHover: true },
            { title: "فروش بدون کمیسیون", meta: "مدت محدود", description: "ماشینت رو ثبت کن، ما برات می‌فروشیم.", icon: <Handshake className="h-4 w-4 text-primary" />, status: "VIP", tags: ["فروش"] },
            { title: "گذر موقت", meta: "تحویل روز", description: "خودروهای گذر موقت با مدت تردد مشخص.", icon: <Timer className="h-4 w-4 text-primary" />, status: "موجود", tags: ["مناطق آزاد"] },
            { title: "فروش حواله", meta: "جانبازی و واردات", description: "حواله‌های کارخانه‌ای، جانبازی و واردات با تاریخ تحویل.", icon: <Ticket className="h-4 w-4 text-primary" />, status: "به‌روز", tags: ["حواله"] },
            { title: "دیتیلینگ خودرو", meta: "نقد و اقساط", description: "سرامیک بدنه، واکس و پولیش، کاور بدنه، صفرشویی.", icon: <Sparkles className="h-4 w-4 text-primary" />, status: "جدید", tags: ["سرامیک", "PPF"], colSpan: 2 },
            { title: "کارشناسی و تعویض پلاک", meta: "از انتخاب تا پلاک", description: "کارشناسی رنگ و فنی و همراهی تا تعویض پلاک.", icon: <FileCheck2 className="h-4 w-4 text-primary" />, status: "کامل", tags: ["کارشناسی"] },
            { title: "قرارداد شفاف و امن", meta: "پرداخت آنلاین", description: "بیعانه‌ی آنلاین، قرارداد و پیگیری مرحله‌به‌مرحله در پروفایل.", icon: <ShieldCheck className="h-4 w-4 text-primary" />, status: "امن", tags: ["بیعانه", "قرارداد"], colSpan: 2 },
          ]}
        />
      </section>

      {/* سازمان‌های طرف قرارداد */}
      <section id="organizations" className="py-16">
        <SectionTitle eyebrow="فروش سازمانی و اقساطی" title="طرف قرارداد با سازمان‌های استان فارس" />
        <LogoMarquee
          label="سازمان‌های طرف قرارداد"
          speed={36}
          gap={56}
          items={organizations.map((o, i) => ({
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

      {/* ماشینت رو بفروش */}
      <CTA
        title="ماشینت رو بدون کمیسیون بفروش"
        description="اطلاعات خودرو رو ثبت کن؛ کارشناس‌های مروجی موتورز برای کارشناسی و پذیرش باهات تماس می‌گیرن."
        primaryText="ثبت خودرو برای فروش"
        primaryHref="/contact?type=SellMyCar"
        secondaryText="تماس: ۰۹۱۷۱۰۰۶۰۰۳"
        secondaryHref="tel:09171006003"
      />

      {/* رضایت مشتری */}
      <section id="reviews" className="py-20">
        <SectionTitle eyebrow="رضایت مشتری" title="صدای مشتری‌های مروجی موتورز" text="(متن نمونه — نظرات واقعی از پنل ادمین جایگزین می‌شوند)" />
        <VerticalMarqueeDemo reviews={sampleReviews} />
      </section>

      {/* نمایشگاه — برج بارانا */}
      <section aria-label="نمایشگاه" className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-24 z-10 text-center">
          <p className="text-sm font-semibold text-primary">شیراز، چهارراه زرگری، برج بارانا، طبقه اول</p>
          <h2 className="mt-2 text-3xl font-black md:text-5xl">نمایشگاه مروجی موتورز</h2>
        </div>
        <ZoomParallax
          images={[
            { src: unsplash(PHOTOS.mercedesGarage, 1800), alt: "نمایشگاه" },
            { src: unsplash(PHOTOS.rangeRoverGarage, 1200), alt: "خودرو" },
            { src: unsplash(PHOTOS.camry, 1000), alt: "تویوتا کمری" },
            { src: unsplash(PHOTOS.bmwWhite, 1000), alt: "بی‌ام‌و" },
            { src: unsplash(PHOTOS.rav4, 1000), alt: "تویوتا راوفور" },
            { src: unsplash(PHOTOS.wash, 1000), alt: "دیتیلینگ" },
            { src: unsplash(PHOTOS.audi, 800), alt: "آئودی" },
          ]}
        />
      </section>
    </>
  );
}

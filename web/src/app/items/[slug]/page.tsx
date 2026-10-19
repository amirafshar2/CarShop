import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { getListing, mediaUrl } from "@/lib/api";
import { fieldValue, getSite, priceText, whatsappLink } from "@/lib/site";
import { toman } from "@/lib/format";
import Gallery from "./gallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await getListing(decodeURIComponent((await params).slug));
  return item ? { title: item.title, description: item.summary ?? undefined, openGraph: { images: item.images[0] ? [mediaUrl(item.images[0])] : undefined } } : { title: "پیدا نشد" };
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeURIComponent((await params).slug);
  const [item, site] = await Promise.all([getListing(slug), getSite()]);
  if (!item) notFound();
  const c = site.content;
  const specs = c.fields.map((f) => ({ label: f.label, value: fieldValue(f, item.attributes[f.key]) })).filter((s) => s.value);
  const soldOut = item.status === "SoldOut";
  const wa = whatsappLink(c.contact.whatsapp);
  const waText = encodeURIComponent(`سلام، درباره‌ی «${item.title}» سؤال داشتم.`);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-32 md:pt-36">
      <nav aria-label="مسیر" className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/items" className="hover:text-foreground">{c.labels.itemPlural}</Link>
        <ChevronLeft className="size-4" aria-hidden />
        <span className="truncate text-foreground">{item.title}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Gallery images={item.images.map(mediaUrl)} title={item.title} />
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {item.category && <span className="rounded-full border border-border px-3 py-1 text-sm">{item.category}</span>}
            {item.badge && <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">{item.badge}</span>}
            {soldOut && <span className="rounded-full bg-foreground px-3 py-1 text-sm font-bold text-background">{c.labels.soldOutLabel}</span>}
          </div>
          <h1 className="text-3xl font-black leading-tight md:text-4xl">{item.title}</h1>
          {item.summary && <p className="text-lg text-muted-foreground">{item.summary}</p>}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-black text-primary">{priceText(item)}</span>
            {item.unit && item.priceType !== "OnCall" && <span className="text-muted-foreground">/ {item.unit}</span>}
            {item.originalPriceRial && <s className="text-muted-foreground">{toman(item.originalPriceRial)}</s>}
          </div>
          {specs.length > 0 && (
            <dl className="grid grid-cols-2 gap-3">
              {specs.map((s) => (
                <div key={s.label} className="rounded-[var(--radius)] border border-border bg-card p-3">
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="mt-1 font-bold">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="sticky bottom-4 z-20 grid gap-3 rounded-[var(--radius)] border border-border bg-background/90 p-3 backdrop-blur-xl sm:grid-cols-2 lg:static lg:border-0 lg:bg-transparent lg:p-0">
            <Button asChild size="lg" className="h-12 text-base font-bold">
              <Link href={`/contact?item=${item.id}&title=${encodeURIComponent(item.title)}`}>{c.labels.requestButton}</Link>
            </Button>
            {wa && (
              <Button asChild size="lg" variant="outline" className="h-12 text-base">
                <a href={`${wa}?text=${waText}`} target="_blank" rel="noopener noreferrer"><FaWhatsapp className="size-5" aria-hidden /> واتساپ</a>
              </Button>
            )}
          </div>
        </div>
      </div>
      {item.description && (
        <section className="mt-14 max-w-3xl">
          <h2 className="mb-4 text-2xl font-black">توضیحات</h2>
          <p className="whitespace-pre-line text-lg leading-8 text-muted-foreground">{item.description}</p>
        </section>
      )}
    </div>
  );
}

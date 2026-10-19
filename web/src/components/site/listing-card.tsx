import Link from "next/link";
import { ImageOff } from "lucide-react";
import { mediaUrl, type Listing } from "@/lib/api";
import { fieldValue, priceText, type SiteContent } from "@/lib/site";
import { toman } from "@/lib/format";

/** Card used on the home page and the list page; chips come from the fields marked «نمایش روی کارت». */
export default function ListingCard({ item, site }: { item: Listing; site: SiteContent }) {
  const cover = item.images[0];
  const chips = site.fields
    .filter((f) => f.showOnCard)
    .map((f) => fieldValue(f, item.attributes[f.key]))
    .filter(Boolean) as string[];
  const soldOut = item.status === "SoldOut";
  return (
    <Link
      href={`/items/${encodeURIComponent(item.slug)}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(cover)} alt={item.title} loading="lazy" className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? "grayscale" : ""}`} />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground"><ImageOff className="size-8" aria-hidden /></div>
        )}
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-2">
          {soldOut && <span className="rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">{site.labels.soldOutLabel}</span>}
          {item.badge && !soldOut && <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{item.badge}</span>}
          {item.category && <span className="rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">{item.category}</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
        {item.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>}
        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {chips.map((c) => <li key={c} className="rounded-full border border-border px-2.5 py-1">{c}</li>)}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-2">
          <span className="text-lg font-black text-primary">{priceText(item)}</span>
          {item.unit && item.priceType !== "OnCall" && <span className="text-sm text-muted-foreground">/ {item.unit}</span>}
          {item.originalPriceRial && <s className="text-sm text-muted-foreground">{toman(item.originalPriceRial)}</s>}
        </div>
      </div>
    </Link>
  );
}

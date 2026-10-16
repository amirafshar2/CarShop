import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Phone, Sparkles, Car, FileCheck2, Wrench } from "lucide-react";
import * as PricingCard from "@/components/ui/pricing-card";
import { Button } from "@/components/ui/button";
import { getServices, type ServiceCategory } from "@/lib/api";
import { toman } from "@/lib/format";
import { categoryLabels, categoryLeadType, servicePrice } from "@/lib/services";

export const metadata: Metadata = {
  title: "خدمات و قیمت‌ها",
  description: "لیست قیمت خدمات مروجی موتورز — سرامیک، پولیش، صفرشویی، کاور بدنه، خرید از راه دور، کارشناسی و تعویض پلاک.",
};
export const dynamic = "force-dynamic"; // prices edited in the admin panel show up immediately

const icons: Record<ServiceCategory, React.ReactNode> = {
  Detailing: <Sparkles />,
  Purchase: <Car />,
  Paperwork: <FileCheck2 />,
  Other: <Wrench />,
};
const order: ServiceCategory[] = ["Detailing", "Purchase", "Paperwork", "Other"];

export default async function ServicesPage() {
  const services = await getServices();
  const groups = order
    .map((c) => ({ category: c, items: (services ?? []).filter((s) => s.category === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-36">
      <header className="mx-auto mb-14 max-w-3xl text-center">
        <p className="text-sm font-semibold text-primary">خدمات مروجی موتورز</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">خدمات و قیمت‌ها</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          قیمت‌ها شفاف و به‌روز هستند. برای رزرو هر خدمت روی دکمه‌اش بزنید تا کارشناس ما با شما تماس بگیرد.
        </p>
        {groups.length > 1 && (
          <nav aria-label="دسته‌بندی خدمات" className="mt-8 flex flex-wrap justify-center gap-2">
            {groups.map((g) => (
              <a key={g.category} href={`#${g.category}`} className="rounded-full border border-border px-4 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {categoryLabels[g.category]}
              </a>
            ))}
          </nav>
        )}
      </header>

      {!services && <p className="text-center text-muted-foreground">برای نمایش خدمات، API را اجرا کنید (README).</p>}

      <div className="space-y-20">
        {groups.map((g) => (
          <section key={g.category} id={g.category} aria-labelledby={`${g.category}-title`}>
            <h2 id={`${g.category}-title`} className="mb-8 flex items-center gap-3 text-2xl font-black md:text-3xl">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary [&_svg]:size-5">{icons[g.category]}</span>
              {categoryLabels[g.category]}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {g.items.map((s) => {
                const params = new URLSearchParams({ type: categoryLeadType[s.category], service: s.title });
                return (
                  <PricingCard.Card key={s.id} className={`flex max-w-none flex-col ${s.isFeatured ? "border-primary/60 ring-1 ring-primary/40" : ""}`}>
                    <PricingCard.Header>
                      <PricingCard.Plan className="mb-6">
                        <PricingCard.PlanName className="text-base text-foreground">{s.title}</PricingCard.PlanName>
                        {s.badge && <PricingCard.Badge className="border-primary/50 bg-primary/15 text-sm text-primary">{s.badge}</PricingCard.Badge>}
                      </PricingCard.Plan>
                      <PricingCard.Price className="flex-wrap">
                        <PricingCard.MainPrice className="text-2xl">{servicePrice(s)}</PricingCard.MainPrice>
                        {s.unit && s.priceType !== "OnCall" && <PricingCard.Period>/ {s.unit}</PricingCard.Period>}
                        {s.originalPriceRial && <PricingCard.OriginalPrice className="text-base">{toman(s.originalPriceRial)}</PricingCard.OriginalPrice>}
                      </PricingCard.Price>
                      <Button asChild className="w-full font-bold" variant={s.isFeatured ? "default" : "outline"}>
                        <Link href={`/contact?${params.toString()}`}>{s.priceType === "OnCall" ? "استعلام قیمت" : "رزرو این خدمت"}</Link>
                      </Button>
                    </PricingCard.Header>
                    <PricingCard.Body className="flex-1">
                      {s.description && <PricingCard.Description className="text-sm leading-7">{s.description}</PricingCard.Description>}
                      {s.features.length > 0 && (
                        <PricingCard.List>
                          {s.features.map((f) => (
                            <PricingCard.ListItem key={f} className="text-[15px]">
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                              <span>{f}</span>
                            </PricingCard.ListItem>
                          ))}
                        </PricingCard.List>
                      )}
                    </PricingCard.Body>
                  </PricingCard.Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-20 flex flex-col items-center justify-between gap-4 rounded-3xl border border-border bg-card p-8 text-center md:flex-row md:text-start">
        <div>
          <p className="text-xl font-bold">خدمت مورد نظرتون رو پیدا نکردید؟</p>
          <p className="mt-1 text-muted-foreground">تماس بگیرید؛ برای هر خودرو قیمت دقیق اعلام می‌کنیم.</p>
        </div>
        <Button asChild size="lg">
          <a href="tel:+989171006003" className="inline-flex items-center gap-2">
            <Phone className="size-5" aria-hidden /> <span dir="ltr">۰۹۱۷ ۱۰۰ ۶۰۰۳</span>
          </a>
        </Button>
      </div>
    </div>
  );
}

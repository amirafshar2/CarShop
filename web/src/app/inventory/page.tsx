import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { coverOf, getCars } from "@/lib/api";
import { fa, faNum, km, listingLabels, tagList, toman } from "@/lib/format";
import Filters from "./filters";

export const metadata: Metadata = { title: "موجودی خودرو", description: "لیست موجودی روز مروجی موتورز — صفر، کارکرده، گذر موقت و حواله." };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  );
  if (!query.has("pageSize")) query.set("pageSize", "24");
  const data = await getCars(query.toString());

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-32">
      <header className="mb-10">
        <p className="text-sm font-semibold text-primary">لیست موجودی روز</p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">موجودی مروجی موتورز</h1>
        <p className="mt-3 text-muted-foreground">{data ? `${fa(data.totalCount)} خودرو` : "API در دسترس نیست — README را ببینید."}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
          <Filters />
        </Suspense>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data?.items.map((car) => (
            <Link key={car.id} href={`/cars/${car.slug}`} className="group block">
              <SpotlightCard className="h-full overflow-hidden !p-0" spotlightColor="rgba(242,106,27,0.18)">
                <div className="relative aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverOf(car, 900)} alt={car.titleFa} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute start-3 top-3 flex gap-2">
                    <Badge>{listingLabels[car.listingType]}</Badge>
                    {car.status === "Reserved" && <Badge variant="secondary">رزرو شده</Badge>}
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <h2 className="text-lg font-bold">{car.titleFa}</h2>
                  <p className="text-sm text-muted-foreground">
                    مدل {faNum(car.modelYear)} · {car.condition === "New" ? "صفر کیلومتر" : km(car.mileageKm)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tagList(car.tags).map((t) => (
                      <Badge key={t} variant="outline">{t}</Badge>
                    ))}
                  </div>
                  <p className="text-xl font-black text-primary">{car.priceOnCall ? "قیمت تماس" : toman(car.priceRial)}</p>
                </div>
              </SpotlightCard>
            </Link>
          ))}
          {data && data.items.length === 0 && <p className="text-muted-foreground">خودرویی با این فیلترها پیدا نشد.</p>}
        </div>
      </div>
    </div>
  );
}

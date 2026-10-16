import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ThumbnailImageViewer from "@/components/ui/thumbnail-image-viewer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { coverOf, getCar } from "@/lib/api";
import { PHOTOS, unsplash } from "@/lib/media";
import {
  conditionLabels, drivetrainLabels, fa, faNum, fuelLabels, hawalehLabels, km, listingLabels, tagList, toman, transmissionLabels,
} from "@/lib/format";
import CarActions from "./actions";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const car = await getCar((await params).slug);
  if (!car) return { title: "خودرو پیدا نشد" };
  return {
    title: `${car.titleFa} مدل ${faNum(car.modelYear)}`,
    description: `${car.titleFa} — ${conditionLabels[car.condition]}، ${km(car.mileageKm)}، ${car.priceOnCall ? "قیمت تماس" : toman(car.priceRial)}. مروجی موتورز شیراز.`,
    openGraph: { images: [coverOf(car, 1200)] },
  };
}

export default async function CarPage({ params }: { params: Params }) {
  const car = await getCar((await params).slug);
  if (!car) notFound();

  const photos = car.images.length
    ? car.images.map((i, n) => ({ src: i.url, alt: i.alt ?? car.titleFa, title: car.titleFa, location: `عکس ${fa(n + 1)}` }))
    : [
        { src: coverOf(car, 1800), alt: car.titleFa, title: car.titleFa, location: "تصویر نمونه / ۱", credit: "Unsplash" },
        { src: unsplash(PHOTOS.mercedesGarage, 1800), alt: "نمایشگاه", title: "نمایشگاه مروجی موتورز", location: "تصویر نمونه / ۲", credit: "Unsplash" },
        { src: unsplash(PHOTOS.wash, 1800), alt: "دیتیلینگ", title: "آماده‌سازی قبل از تحویل", location: "تصویر نمونه / ۳", credit: "Unsplash" },
        { src: unsplash(PHOTOS.rain, 1800), alt: "خودرو", title: car.titleFa, location: "تصویر نمونه / ۴", credit: "Unsplash" },
      ];

  const specs: [string, string | null | undefined][] = [
    ["نوع", listingLabels[car.listingType]],
    ["وضعیت", conditionLabels[car.condition]],
    ["سال ساخت", `${faNum(car.modelYear)} ${car.yearCalendar === "Solar" ? "(شمسی)" : "(میلادی)"}`],
    ["فیس", car.faceliftYear ? faNum(car.faceliftYear) : null],
    ["تیپ", car.trim],
    ["پکیج", car.package],
    ["کارکرد", km(car.mileageKm)],
    ["رنگ", car.colors?.replaceAll(",", "، ")],
    ["گیربکس", transmissionLabels[car.transmission]],
    ["سوخت", fuelLabels[car.fuelType]],
    ["دیفرانسیل", drivetrainLabels[car.drivetrain]],
    ["سفارش / تولید", car.originCountry],
    ["بدنه", car.bodyCondition],
    ["مدت تردد گذر موقت", car.temporaryPassMonths ? `${fa(car.temporaryPassMonths)} ماه` : null],
    ["منطقه‌ی آزاد", car.freeZone],
    ["نوع حواله", car.hawalehType ? hawalehLabels[car.hawalehType] : null],
    ["تاریخ تحویل حواله", car.hawalehDeliveryOn ? new Date(car.hawalehDeliveryOn).toLocaleDateString("fa-IR") : null],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: car.titleFa,
    brand: car.brandEn,
    model: car.modelEn,
    vehicleModelDate: String(car.modelYear),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: car.mileageKm, unitCode: "KMT" },
    offers: car.priceOnCall ? undefined : { "@type": "Offer", priceCurrency: "IRR", price: car.priceRial },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-32">
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <ThumbnailImageViewer title={car.titleFa} subtitle="مروجی موتورز" images={photos} />

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge>{listingLabels[car.listingType]}</Badge>
            {car.status === "Reserved" && <Badge variant="secondary">رزرو شده</Badge>}
            {tagList(car.tags).map((t) => (
              <Badge key={t} variant="outline">{t}</Badge>
            ))}
          </div>
          <h1 className="text-4xl font-black leading-tight">{car.titleFa}</h1>
          <p className="text-3xl font-black text-primary">{car.priceOnCall ? "قیمت تماس" : toman(car.priceRial)}</p>
          {car.description && <p className="leading-8 text-muted-foreground">{car.description}</p>}
          <Separator />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {specs.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-10">
        <CarActions carId={car.id} slug={car.slug} reserved={car.status === "Reserved"} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}

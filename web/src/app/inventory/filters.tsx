"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import Slider06 from "@/components/ui/slider-06";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { fa } from "@/lib/format";

const MAX_MILLION_TOMAN = 10_000; // ۱۰ میلیارد تومان
const RIAL_PER_MILLION_TOMAN = 10_000_000;
const toRial = (millionToman: number) => millionToman * RIAL_PER_MILLION_TOMAN;
const fromRial = (rial: string | null, fallback: number) => {
  const n = Number(rial);
  return rial && Number.isFinite(n) ? Math.round(n / RIAL_PER_MILLION_TOMAN) : fallback;
};

const FILTERS: { key: string; label: string; options: [string, string][]; all?: string }[] = [
  { key: "listingType", label: "نوع", options: [["Regular", "موجود در نمایشگاه"], ["TemporaryPass", "گذر موقت"], ["Hawaleh", "حواله"]] },
  { key: "condition", label: "وضعیت", options: [["New", "صفر"], ["Used", "کارکرده"]] },
  { key: "transmission", label: "گیربکس", options: [["Automatic", "اتومات"], ["Manual", "دنده‌ای"]] },
];
const SORTS: [string, string][] = [["newest", "جدیدترین"], ["price_asc", "ارزان‌ترین"], ["price_desc", "گران‌ترین"], ["year_desc", "مدل بالاتر"], ["mileage_asc", "کمترین کارکرد"]];
const FILTER_KEYS = ["search", "listingType", "condition", "transmission", "priceFromRial", "priceToRial"];

export default function Filters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.push(`/inventory?${next.toString()}`, { scroll: false }));
  };

  const activeCount = FILTER_KEYS.filter((k) => params.has(k)).length;
  const priceLow = fromRial(params.get("priceFromRial"), 0);
  const priceHigh = fromRial(params.get("priceToRial"), MAX_MILLION_TOMAN);

  const panel = (
    <div className={`space-y-6 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("search")?.toString().trim();
          set({ search: q || null });
          setOpen(false);
        }}
        className="flex gap-2"
        role="search"
      >
        <Input name="search" aria-label="جستجو" defaultValue={params.get("search") ?? ""} placeholder="جستجو: کمری، BMW، ..." />
        <Button type="submit">جستجو</Button>
      </form>

      {FILTERS.map((f) => (
        <div key={f.key} className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{f.label}</p>
          <Select value={params.get(f.key) ?? "all"} onValueChange={(v) => set({ [f.key]: v === "all" ? null : v })}>
            <SelectTrigger className="w-full" aria-label={f.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {f.options.map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">مرتب‌سازی</p>
        <Select value={params.get("sort") ?? "newest"} onValueChange={(v) => set({ sort: v === "newest" ? null : v })}>
          <SelectTrigger className="w-full" aria-label="مرتب‌سازی">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Slider06
        key={`${priceLow}-${priceHigh}`}
        min={0}
        max={MAX_MILLION_TOMAN}
        step={100}
        label="بازه‌ی قیمت"
        unit="میلیون تومان"
        clearText="همه‌ی قیمت‌ها"
        value={[priceLow, priceHigh]}
        onCommit={([lo, hi]) =>
          set({
            priceFromRial: lo > 0 ? String(toRial(lo)) : null,
            priceToRial: hi < MAX_MILLION_TOMAN ? String(toRial(hi)) : null,
          })
        }
      />

      <Button
        variant="outline"
        className="w-full"
        disabled={activeCount === 0 && !params.has("sort")}
        onClick={() => {
          start(() => router.push("/inventory", { scroll: false }));
          setOpen(false);
        }}
      >
        حذف همه‌ی فیلترها
      </Button>
    </div>
  );

  return (
    <>
      {/* دسکتاپ: پنل کناری ثابت */}
      <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start rounded-2xl border border-border bg-card p-5" aria-label="فیلترها">
        {panel}
      </aside>

      {/* موبایل و تبلت: دکمه‌ی فیلتر + Sheet */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="size-5" />
                فیلتر و مرتب‌سازی
              </span>
              {activeCount > 0 && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-primary-foreground">{fa(activeCount)}</span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>فیلتر و مرتب‌سازی</SheetTitle>
              <SheetDescription>نتیجه بلافاصله پس از هر انتخاب به‌روز می‌شود.</SheetDescription>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

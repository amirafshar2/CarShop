import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import ListingCard from "@/components/site/listing-card";
import { Button } from "@/components/ui/button";
import { getListings } from "@/lib/api";
import { getSite } from "@/lib/site";
import { fa } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getSite();
  return { title: content.labels.itemsPageTitle };
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ItemsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { content: c } = await getSite();
  const filterFields = c.fields.filter((f) => f.filter && f.type === "select");
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const query = new URLSearchParams();
  for (const k of ["q", "category", "sort"]) if (one(sp[k])) query.set(k, one(sp[k]));
  for (const f of filterFields) if (one(sp[`f_${f.key}`])) query.set(`f_${f.key}`, one(sp[`f_${f.key}`]));
  const base = query.toString();
  query.set("page", String(page));
  query.set("pageSize", "12");
  const data = await getListings(query.toString());

  const link = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(base);
    for (const [k, v] of Object.entries(patch)) (v ? q.set(k, v) : q.delete(k));
    const s = q.toString();
    return `/items${s ? `?${s}` : ""}`;
  };
  const selectCls = "h-11 w-full rounded-[var(--radius)] border border-input bg-background px-3 text-[15px]";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-32 md:pt-36">
      <header className="mb-8">
        <h1 className="text-3xl font-black md:text-5xl">{c.labels.itemsPageTitle}</h1>
        {data && <p className="mt-2 text-muted-foreground">{`${fa(data.totalCount)} ${c.labels.itemSingular}`}</p>}
      </header>

      {c.categories.length > 0 && (
        <nav aria-label={c.labels.categoryLabel} className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link href={link({ category: null, page: null })} aria-current={!one(sp.category) ? "page" : undefined}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-[15px] font-medium ${!one(sp.category) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent"}`}>همه</Link>
          {c.categories.map((cat) => (
            <Link key={cat} href={link({ category: cat, page: null })} aria-current={one(sp.category) === cat ? "page" : undefined}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-[15px] font-medium ${one(sp.category) === cat ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent"}`}>{cat}</Link>
          ))}
        </nav>
      )}

      {/* Plain GET form: works without JavaScript and on every screen size */}
      <form method="get" action="/items" className="mb-10 grid gap-3 rounded-[var(--radius)] border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(auto-fit,minmax(140px,1fr))]">
        {one(sp.category) && <input type="hidden" name="category" value={one(sp.category)} />}
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">جستجو</span>
          <Search className="pointer-events-none absolute start-3 top-3 size-5 text-muted-foreground" aria-hidden />
          <input name="q" defaultValue={one(sp.q)} placeholder={`جستجو در ${c.labels.itemPlural}`} className={`${selectCls} ps-10`} />
        </label>
        {filterFields.map((f) => (
          <label key={f.key}>
            <span className="sr-only">{f.label}</span>
            <select name={`f_${f.key}`} defaultValue={one(sp[`f_${f.key}`])} className={selectCls}>
              <option value="">{`${f.label}: همه`}</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
        <label>
          <span className="sr-only">مرتب‌سازی</span>
          <select name="sort" defaultValue={one(sp.sort)} className={selectCls}>
            <option value="">پیشنهادی</option>
            <option value="price-asc">ارزان‌ترین</option>
            <option value="price-desc">گران‌ترین</option>
          </select>
        </label>
        <Button type="submit" className="h-11">اعمال</Button>
      </form>

      {!data && <p className="text-center text-muted-foreground">ارتباط با سرور برقرار نشد.</p>}
      {data && data.items.length === 0 && (
        <div className="rounded-[var(--radius)] border border-dashed border-border p-12 text-center text-muted-foreground">
          {base ? <>چیزی پیدا نشد. <Link href="/items" className="text-primary underline">پاک کردن فیلترها</Link></> : `هنوز ${c.labels.itemSingular}ی اضافه نشده است.`}
        </div>
      )}
      {data && data.items.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((l) => <ListingCard key={l.id} item={l} site={c} />)}
        </div>
      )}
      {data && data.totalPages > 1 && (
        <nav aria-label="صفحه‌ها" className="mt-12 flex flex-wrap justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={link({ page: p === 1 ? null : String(p) })} aria-current={p === page ? "page" : undefined}
              className={`grid size-11 place-items-center rounded-[var(--radius)] border ${p === page ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}>{fa(p)}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}

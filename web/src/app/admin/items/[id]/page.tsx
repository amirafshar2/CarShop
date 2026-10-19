"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminHeader } from "@/components/app/admin-page";
import { AreaField, ImagesField, SwitchRow, TextField } from "@/components/admin/fields";
import { apiGet, apiSend, isAdmin, type Listing, type ListingStatus, type PriceType } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useAdminSite } from "@/lib/admin-site";
import { listingStatusLabels } from "@/lib/labels";
import { priceTypeLabels } from "@/lib/services";
import { toman } from "@/lib/format";

type Form = {
  title: string; category: string; summary: string; description: string; priceType: PriceType; price: string; original: string;
  unit: string; badge: string; images: string[]; attributes: Record<string, string>; status: ListingStatus; isFeatured: boolean; sortOrder: string; version: string | null;
};
const empty: Form = { title: "", category: "", summary: "", description: "", priceType: "Fixed", price: "", original: "", unit: "", badge: "", images: [], attributes: {}, status: "Published", isFeatured: false, sortOrder: "0", version: null };
const digits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
const rial = (t: string) => (digits(t) ? Number(digits(t)) * 10 : null);
const tomanStr = (r: number | null) => (r ? String(r / 10) : "");

const fromListing = (l: Listing): Form => ({
  title: l.title, category: l.category ?? "", summary: l.summary ?? "", description: l.description ?? "", priceType: l.priceType,
  price: tomanStr(l.priceRial), original: tomanStr(l.originalPriceRial), unit: l.unit ?? "", badge: l.badge ?? "", images: l.images,
  attributes: l.attributes, status: l.status, isFeatured: l.isFeatured, sortOrder: String(l.sortOrder), version: l.version,
});

export default function ItemEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const { user } = useSession();
  const { site, reload: reloadSite } = useAdminSite();
  const [form, setForm] = useState<Form | null>(isNew ? empty : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = isNew || isAdmin(user);

  useEffect(() => {
    if (isNew) return;
    apiGet<Listing>(`/api/v1/admin/listings/${id}`).then((l) => setForm(fromListing(l))).catch((e: Error) => setError(e.message));
  }, [id, isNew]);

  if (!site || !form) return error ? <p role="alert" className="text-destructive">{error}</p> : <Skeleton className="h-96 w-full rounded-2xl" />;
  const L = site.content.labels;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const setAttr = (k: string, v: string) => setForm((f) => (f ? { ...f, attributes: { ...f.attributes, [k]: v } } : f));

  const submit = async () => {
    setBusy(true);
    setError(null);
    const body = {
      title: form.title, category: form.category || null, summary: form.summary || null, description: form.description || null,
      priceType: form.priceType, priceRial: form.priceType === "OnCall" ? null : rial(form.price),
      originalPriceRial: form.priceType === "OnCall" ? null : rial(form.original), unit: form.unit || null, badge: form.badge || null,
      images: form.images, attributes: form.attributes, status: form.status, isFeatured: form.isFeatured,
      sortOrder: Number(digits(form.sortOrder) || 0), version: form.version,
    };
    try {
      if (isNew) await apiSend("/api/v1/admin/listings", "POST", body);
      else await apiSend(`/api/v1/admin/listings/${id}`, "PUT", body);
      toast.success(isNew ? `${L.itemSingular} اضافه شد.` : "ذخیره شد.");
      await reloadSite();
      router.push("/admin/items");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selectCls = "h-11";
  return (
    <form className="mx-auto max-w-4xl" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <Button asChild variant="ghost" className="mb-3"><Link href="/admin/items"><ArrowRight className="size-4" />{L.itemPlural}</Link></Button>
      <AdminHeader title={isNew ? `${L.itemSingular} جدید` : `ویرایش ${L.itemSingular}`} />
      {!canEdit && <p className="mb-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">فقط مدیر می‌تواند موارد موجود را ویرایش کند.</p>}
      <fieldset disabled={!canEdit} className="grid gap-6">
        <div className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6">
          <TextField className="sm:col-span-2" label="عنوان" required value={form.title} onChange={(v) => set("title", v)} max={150} />
          <div className="grid gap-2">
            <Label>{L.categoryLabel}</Label>
            {site.content.categories.length > 0 ? (
              <Select value={form.category || "__none"} onValueChange={(v) => set("category", v === "__none" ? "" : v)}>
                <SelectTrigger className={selectCls} aria-label={L.categoryLabel}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">بدون دسته</SelectItem>
                  {site.content.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} className={selectCls} maxLength={60} aria-label={L.categoryLabel} />
            )}
          </div>
          <TextField label="برچسب روی عکس (اختیاری)" value={form.badge} onChange={(v) => set("badge", v)} max={30} placeholder="ویژه / تخفیف / جدید" />
          <TextField className="sm:col-span-2" label="توضیح کوتاه" value={form.summary} onChange={(v) => set("summary", v)} max={200} hint="زیر عنوان روی کارت دیده می‌شود." />
          <AreaField className="sm:col-span-2" label="توضیحات کامل" value={form.description} onChange={(v) => set("description", v)} max={5000} rows={6} />
        </div>

        {site.content.fields.length > 0 && (
          <div className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6">
            <p className="font-bold sm:col-span-2">مشخصات</p>
            {site.content.fields.map((f) =>
              f.type === "select" ? (
                <div key={f.key} className="grid gap-2">
                  <Label>{f.label}</Label>
                  <Select value={form.attributes[f.key] || "__none"} onValueChange={(v) => setAttr(f.key, v === "__none" ? "" : v)}>
                    <SelectTrigger className={selectCls} aria-label={f.label}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <TextField key={f.key} label={f.suffix ? `${f.label} (${f.suffix})` : f.label} value={form.attributes[f.key]} onChange={(v) => setAttr(f.key, f.type === "number" ? digits(v) : v)}
                  dir={f.type === "number" ? "ltr" : undefined} max={200} />
              ),
            )}
            <p className="text-xs text-muted-foreground sm:col-span-2">فیلدها را از «تنظیمات سایت ← آیتم‌ها و فیلدها» عوض کنید.</p>
          </div>
        )}

        <div className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6">
          <p className="font-bold sm:col-span-2">قیمت</p>
          <div className="grid gap-2">
            <Label>نوع قیمت</Label>
            <Select value={form.priceType} onValueChange={(v) => set("priceType", v as PriceType)}>
              <SelectTrigger className={selectCls} aria-label="نوع قیمت"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(priceTypeLabels) as PriceType[]).map((p) => <SelectItem key={p} value={p}>{priceTypeLabels[p]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.priceType !== "OnCall" && (
            <>
              <TextField label="قیمت (تومان)" dir="ltr" required value={form.price} onChange={(v) => set("price", v)} hint={rial(form.price) ? `= ${toman(rial(form.price))}` : undefined} />
              <TextField label="قیمت قبل از تخفیف (اختیاری)" dir="ltr" value={form.original} onChange={(v) => set("original", v)} hint="خط‌خورده نمایش داده می‌شود." />
              <TextField label="واحد (اختیاری)" value={form.unit} onChange={(v) => set("unit", v)} max={40} placeholder="هر نفر / هر عدد" />
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6"><ImagesField value={form.images} onChange={(v) => set("images", v)} /></div>

        <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6">
          <div className="grid gap-2">
            <Label>وضعیت</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as ListingStatus)}>
              <SelectTrigger className={selectCls} aria-label="وضعیت"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(listingStatusLabels) as ListingStatus[]).map((s) => <SelectItem key={s} value={s}>{s === "SoldOut" ? L.soldOutLabel : listingStatusLabels[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <TextField label="ترتیب نمایش" dir="ltr" value={form.sortOrder} onChange={(v) => set("sortOrder", v)} hint="عدد کمتر = جلوتر" />
          <div className="sm:col-span-2"><SwitchRow label="ویژه" hint="در صفحه‌ی اول نمایش داده می‌شود." checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} /></div>
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {canEdit && (
        <div className="sticky bottom-20 z-30 mt-6 flex justify-end gap-3 rounded-2xl border border-border bg-background/90 p-3 backdrop-blur">
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/items")}>انصراف</Button>
          <Button type="submit" disabled={busy || !form.title.trim()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}ذخیره</Button>
        </div>
      )}
    </form>
  );
}

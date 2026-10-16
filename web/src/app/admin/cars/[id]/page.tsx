"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminHeader, LoadState, StatusPill } from "@/components/app/admin-page";
import { apiGet, apiSend, type AdminCarDetail } from "@/lib/api";
import { conditionLabels, drivetrainLabels, fuelLabels, hawalehLabels, listingLabels, tagLabels, toman, transmissionLabels } from "@/lib/format";
import { carStatusColor, carStatusLabels } from "@/lib/labels";

type Form = {
  titleFa: string; brandEn: string; modelEn: string; trim: string; package: string; modelYear: string; yearCalendar: string;
  faceliftYear: string; condition: string; listingType: string; mileageKm: string; colors: string; originCountry: string;
  transmission: string; fuelType: string; drivetrain: string; tags: string[]; description: string; bodyCondition: string; vin: string;
  priceToman: string; priceOnCall: boolean; temporaryPassMonths: string; freeZone: string; hawalehType: string;
  imageUrls: string; publish: boolean; version: string | null;
};

const empty: Form = {
  titleFa: "", brandEn: "", modelEn: "", trim: "", package: "", modelYear: "2025", yearCalendar: "Gregorian", faceliftYear: "",
  condition: "New", listingType: "Regular", mileageKm: "0", colors: "", originCountry: "", transmission: "Automatic",
  fuelType: "Gasoline", drivetrain: "TwoWheel", tags: [], description: "", bodyCondition: "", vin: "", priceToman: "",
  priceOnCall: false, temporaryPassMonths: "", freeZone: "", hawalehType: "Factory", imageUrls: "", publish: true, version: null,
};

const digits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
const num = (s: string) => (digits(s) ? Number(digits(s)) : null);

function fromDetail(d: AdminCarDetail): Form {
  const c = d.car;
  return {
    titleFa: c.titleFa, brandEn: c.brandEn, modelEn: c.modelEn, trim: c.trim ?? "", package: c.package ?? "", modelYear: String(c.modelYear),
    yearCalendar: c.yearCalendar, faceliftYear: c.faceliftYear ? String(c.faceliftYear) : "", condition: c.condition, listingType: c.listingType,
    mileageKm: String(c.mileageKm), colors: c.colors, originCountry: c.originCountry ?? "", transmission: c.transmission, fuelType: c.fuelType,
    drivetrain: c.drivetrain, tags: c.tags && c.tags !== "None" ? c.tags.split(",").map((t) => t.trim()) : [], description: c.description ?? "",
    bodyCondition: c.bodyCondition ?? "", vin: d.vin ?? "", priceToman: c.priceRial ? String(c.priceRial / 10) : "", priceOnCall: c.priceOnCall,
    temporaryPassMonths: c.temporaryPassMonths ? String(c.temporaryPassMonths) : "", freeZone: c.freeZone ?? "", hawalehType: c.hawalehType ?? "Factory",
    imageUrls: c.images.map((i) => i.url).join("\n"), publish: c.status === "Available" || c.status === "Reserved", version: c.version,
  };
}

function toPayload(f: Form) {
  return {
    titleFa: f.titleFa, brandEn: f.brandEn, modelEn: f.modelEn, trim: f.trim || null, package: f.package || null,
    modelYear: num(f.modelYear) ?? 0, yearCalendar: f.yearCalendar, faceliftYear: num(f.faceliftYear), condition: f.condition,
    listingType: f.listingType, mileageKm: f.condition === "New" ? 0 : num(f.mileageKm) ?? 0, colors: f.colors,
    originCountry: f.originCountry || null, transmission: f.transmission, fuelType: f.fuelType, drivetrain: f.drivetrain,
    tags: f.tags.length ? f.tags.join(", ") : "None", description: f.description || null, bodyCondition: f.bodyCondition || null,
    vin: f.vin.trim().toUpperCase() || null, priceRial: f.priceOnCall ? null : (num(f.priceToman) ?? 0) * 10, priceOnCall: f.priceOnCall,
    temporaryPassMonths: f.listingType === "TemporaryPass" ? num(f.temporaryPassMonths) : null, temporaryPassExpiresOn: null,
    freeZone: f.listingType === "TemporaryPass" ? f.freeZone || null : null,
    hawalehType: f.listingType === "Hawaleh" ? f.hawalehType : null, hawalehDeliveryOn: null, publish: f.publish,
    imageUrls: f.imageUrls.split("\n").map((u) => u.trim()).filter(Boolean), version: f.version,
  };
}

function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(options).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function Text({ id, label, value, onChange, ...rest }: { id: string; label: string; value: string; onChange: (v: string) => void } & Omit<React.ComponentProps<typeof Input>, "onChange" | "value" | "id">) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

export default function CarEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(isNew ? empty : null);
  const [status, setStatus] = useState<AdminCarDetail["car"]["status"] | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    apiGet<AdminCarDetail>(`/api/v1/admin/cars/${id}`)
      .then((d) => { setForm(fromDetail(d)); setStatus(d.car.status); setSlug(d.car.slug); })
      .catch((e: Error) => setLoadError(e.message));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        await apiSend(`/api/v1/admin/cars`, "POST", toPayload(form));
        toast.success(form.publish ? "خودرو اضافه و در سایت منتشر شد." : "خودرو به‌صورت پیش‌نویس ذخیره شد.");
      } else {
        await apiSend(`/api/v1/admin/cars/${id}`, "PUT", toPayload(form));
        if (!form.publish && status === "Available") await apiSend(`/api/v1/admin/cars/${id}/status`, "POST", { action: "Hide" });
        toast.success("تغییرات ذخیره شد.");
      }
      router.push("/admin/cars");
    } catch (e) {
      setError((e as Error).message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminHeader
        title={isNew ? "افزودن خودرو" : form?.titleFa || "ویرایش خودرو"}
        description={isNew ? "اطلاعات را وارد کنید؛ قیمت‌ها به تومان است." : undefined}
        actions={
          <>
            {status && <StatusPill className={carStatusColor[status]}>{carStatusLabels[status]}</StatusPill>}
            {slug && (status === "Available" || status === "Reserved") && <Button asChild variant="outline"><a href={`/cars/${slug}`} target="_blank" rel="noopener noreferrer">مشاهده در سایت</a></Button>}
            <Button asChild variant="ghost"><Link href="/admin/cars"><ArrowRight className="me-1.5 size-4" />بازگشت</Link></Button>
          </>
        }
      />
      <LoadState loading={!form && !loadError} error={loadError} />
      {error && <p role="alert" className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</p>}
      {form && (
        <form className="grid gap-6 xl:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">مشخصات اصلی</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Text id="c-title" label="عنوان (فارسی)" value={form.titleFa} onChange={(v) => set("titleFa", v)} required maxLength={150} placeholder="مثلاً تویوتا کمری فول" /></div>
                <Text id="c-brand" label="برند (انگلیسی)" dir="ltr" value={form.brandEn} onChange={(v) => set("brandEn", v)} required placeholder="Toyota" />
                <Text id="c-model" label="مدل (انگلیسی)" dir="ltr" value={form.modelEn} onChange={(v) => set("modelEn", v)} required placeholder="Camry" />
                <Text id="c-trim" label="تیپ" value={form.trim} onChange={(v) => set("trim", v)} placeholder="فول / تیپ ۴" />
                <Text id="c-pack" label="پکیج" value={form.package} onChange={(v) => set("package", v)} placeholder="بلک پکیج" />
                <Text id="c-year" label="سال ساخت" dir="ltr" inputMode="numeric" value={form.modelYear} onChange={(v) => set("modelYear", v)} required />
                <Choice label="تقویم سال" value={form.yearCalendar} onChange={(v) => set("yearCalendar", v)} options={{ Gregorian: "میلادی", Solar: "شمسی" }} />
                <Choice label="وضعیت" value={form.condition} onChange={(v) => set("condition", v)} options={conditionLabels} />
                {form.condition === "Used" && <Text id="c-km" label="کارکرد (کیلومتر)" dir="ltr" inputMode="numeric" value={form.mileageKm} onChange={(v) => set("mileageKm", v)} />}
                <Text id="c-colors" label="رنگ‌ها (با , جدا کنید)" value={form.colors} onChange={(v) => set("colors", v)} placeholder="سفید,مشکی" />
                <Text id="c-origin" label="کشور سازنده" value={form.originCountry} onChange={(v) => set("originCountry", v)} placeholder="ژاپن" />
                <Choice label="گیربکس" value={form.transmission} onChange={(v) => set("transmission", v)} options={transmissionLabels} />
                <Choice label="سوخت" value={form.fuelType} onChange={(v) => set("fuelType", v)} options={fuelLabels} />
                <Choice label="دیفرانسیل" value={form.drivetrain} onChange={(v) => set("drivetrain", v)} options={drivetrainLabels} />
                <Text id="c-vin" label="شماره شاسی (VIN) — اختیاری" dir="ltr" value={form.vin} onChange={(v) => set("vin", v)} maxLength={17} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">نوع آگهی</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Choice label="نوع" value={form.listingType} onChange={(v) => set("listingType", v)} options={listingLabels} />
                {form.listingType === "TemporaryPass" && (
                  <>
                    <Text id="c-tp" label="مدت تردد (ماه)" dir="ltr" inputMode="numeric" value={form.temporaryPassMonths} onChange={(v) => set("temporaryPassMonths", v)} required />
                    <Text id="c-fz" label="منطقه‌ی آزاد" value={form.freeZone} onChange={(v) => set("freeZone", v)} placeholder="کیش / قشم / ارس" />
                  </>
                )}
                {form.listingType === "Hawaleh" && <Choice label="نوع حواله" value={form.hawalehType} onChange={(v) => set("hawalehType", v)} options={hawalehLabels} />}
                <fieldset className="grid gap-3 sm:col-span-2">
                  <legend className="mb-2 text-sm font-medium">ویژگی‌ها</legend>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {Object.entries(tagLabels).map(([t, l]) => (
                      <label key={t} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.tags.includes(t)} onCheckedChange={(v) => set("tags", v ? [...form.tags, t] : form.tags.filter((x) => x !== t))} />
                        {l}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">توضیحات و تصاویر</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2"><Label htmlFor="c-desc">توضیحات</Label><Textarea id="c-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="c-body">وضعیت بدنه</Label><Input id="c-body" value={form.bodyCondition} onChange={(e) => set("bodyCondition", e.target.value)} placeholder="بدون رنگ / دو لکه رنگ" /></div>
                <div className="grid gap-2">
                  <Label htmlFor="c-img">آدرس تصاویر (هر خط یک آدرس؛ اولی عکس کاور است)</Label>
                  <Textarea id="c-img" dir="ltr" rows={4} value={form.imageUrls} onChange={(e) => set("imageUrls", e.target.value)} placeholder="https://..." />
                  <p className="text-xs text-muted-foreground">اگر خالی بماند، یک عکس نمونه نمایش داده می‌شود. آپلود مستقیم عکس در مرحله‌ی بعد اضافه می‌شود.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="xl:sticky xl:top-6">
              <CardHeader><CardTitle className="text-lg">قیمت و انتشار</CardTitle></CardHeader>
              <CardContent className="grid gap-5">
                <label className="flex items-center justify-between gap-3 text-sm font-medium">قیمت تماس (قیمت نمایش داده نشود)<Switch checked={form.priceOnCall} onCheckedChange={(v) => set("priceOnCall", v)} /></label>
                {!form.priceOnCall && (
                  <div className="grid gap-2">
                    <Label htmlFor="c-price">قیمت (تومان)</Label>
                    <Input id="c-price" dir="ltr" inputMode="numeric" value={form.priceToman} onChange={(e) => set("priceToman", e.target.value)} required placeholder="850000000" />
                    {num(form.priceToman) ? <p className="text-sm font-semibold text-primary">{toman((num(form.priceToman) ?? 0) * 10)}</p> : null}
                  </div>
                )}
                <label className="flex items-center justify-between gap-3 text-sm font-medium">انتشار در سایت<Switch checked={form.publish} onCheckedChange={(v) => set("publish", v)} disabled={status === "Reserved" || status === "Sold"} /></label>
                {status === "Reserved" && <p className="text-xs text-muted-foreground">این خودرو رزرو فعال دارد؛ با ویرایش، دوباره «موجود» نمی‌شود.</p>}
                <Button type="submit" size="lg" disabled={busy}>{busy ? "در حال ذخیره…" : isNew ? "افزودن خودرو" : "ذخیره‌ی تغییرات"}</Button>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </>
  );
}

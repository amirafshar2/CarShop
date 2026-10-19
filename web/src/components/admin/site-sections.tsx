"use client";

import { Moon, Sun } from "lucide-react";
import { AreaField, ColorField, ImageField, ListEditor, SwitchRow, TextField } from "@/components/admin/fields";
import { ICONS, SiteIcon } from "@/components/site/icon";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials, onColor, radiusOf, type FieldDef, type SiteContent } from "@/lib/site";
import { mediaUrl } from "@/lib/api";

export type SetFn = (path: string, value: unknown) => void;
type P = { c: SiteContent; set: SetFn };

export function BrandSection({ c, set }: P) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField label="نام کسب‌وکار" required value={c.brand.name} onChange={(v) => set("brand.name", v)} max={60} placeholder="مثلاً آژانس سفر آسمان" hint="در بالای سایت، عنوان تب مرورگر و فوتر دیده می‌شود." />
      <TextField label="شعار کوتاه" value={c.brand.tagline} onChange={(v) => set("brand.tagline", v)} max={120} placeholder="مثلاً سفر بی‌دغدغه، از رزرو تا برگشت" />
      <AreaField className="sm:col-span-2" label="توضیح کوتاه درباره‌ی کسب‌وکار" value={c.brand.description} onChange={(v) => set("brand.description", v)} max={500} rows={3} hint="برای گوگل و فوتر سایت استفاده می‌شود؛ یکی دو جمله کافی است." />
      <ImageField className="sm:col-span-2" label="لوگو" value={c.brand.logoUrl} onChange={(v) => set("brand.logoUrl", v)} hint="PNG با پس‌زمینه‌ی شفاف بهترین است. اگر لوگو ندارید، حروف اول نام نشان داده می‌شود." />
    </div>
  );
}

export function LookSection({ c, set }: P) {
  const t = c.theme;
  return (
    <div className="grid gap-6">
      <ColorField value={t.primary} onChange={(v) => set("theme.primary", v)} />
      <div className="grid gap-3">
        <span className="text-sm font-medium">حالت رنگ</span>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          {([["light", "روشن", Sun], ["dark", "تیره", Moon]] as const).map(([v, l, Icon]) => (
            <button key={v} type="button" onClick={() => set("theme.mode", v)} aria-pressed={t.mode === v}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 font-semibold ${t.mode === v ? "border-primary bg-primary/10" : "border-border"}`}>
              <Icon className="size-5" aria-hidden />{l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <span className="text-sm font-medium">گوشه‌ها</span>
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          {([["sharp", "تیز"], ["soft", "نرم"], ["round", "گرد"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => set("theme.corners", v)} aria-pressed={t.corners === v}
              className={`border-2 p-4 text-sm font-semibold ${t.corners === v ? "border-primary bg-primary/10" : "border-border"}`} style={{ borderRadius: radiusOf(v) }}>{l}</button>
          ))}
        </div>
      </div>
      {/* Mini preview */}
      <div className={`overflow-hidden rounded-2xl border border-border ${t.mode === "dark" ? "bg-[#0a0a0b] text-white" : "bg-white text-neutral-900"}`} aria-label="پیش‌نمایش">
        <div className="flex items-center gap-2 border-b border-current/10 p-4">
          {c.brand.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={mediaUrl(c.brand.logoUrl)} alt="" className="h-8 w-auto" />
            : <span className="grid size-8 place-items-center rounded-lg text-xs font-black" style={{ background: t.primary, color: onColor(t.primary) }}>{initials(c.brand.name || "S")}</span>}
          <span className="font-bold">{c.brand.name || "نام کسب‌وکار"}</span>
        </div>
        <div className="p-6">
          <p className="text-2xl font-black">{c.home.heroTitle || "تیتر صفحه‌ی اول"}</p>
          <span className="mt-4 inline-block px-5 py-2.5 text-sm font-bold" style={{ background: t.primary, color: onColor(t.primary), borderRadius: radiusOf(t.corners) }}>{c.labels.requestButton}</span>
        </div>
      </div>
    </div>
  );
}

export function ContactSection({ c, set }: P) {
  const k = c.contact;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField label="تلفن" dir="ltr" value={k.phone} onChange={(v) => set("contact.phone", v)} max={20} placeholder="02112345678" />
      <TextField label="واتساپ" dir="ltr" value={k.whatsapp} onChange={(v) => set("contact.whatsapp", v)} max={20} placeholder="989121234567" hint="با کد کشور و بدون صفر اول، مثل 989121234567" />
      <TextField label="اینستاگرام" dir="ltr" value={k.instagram} onChange={(v) => set("contact.instagram", v)} max={40} placeholder="my.page" hint="فقط نام کاربری، بدون @" />
      <TextField label="تلگرام" dir="ltr" value={k.telegram} onChange={(v) => set("contact.telegram", v)} max={40} placeholder="my_channel" />
      <TextField label="ایمیل" dir="ltr" type="email" value={k.email} onChange={(v) => set("contact.email", v)} max={80} />
      <TextField label="ساعت کاری" value={k.hours} onChange={(v) => set("contact.hours", v)} max={80} placeholder="شنبه تا پنجشنبه ۹ تا ۲۰" />
      <AreaField className="sm:col-span-2" label="آدرس" value={k.address} onChange={(v) => set("contact.address", v)} max={200} rows={2} />
      <TextField className="sm:col-span-2" label="لینک نقشه (گوگل‌مپ / نشان / بلد)" dir="ltr" value={k.mapUrl} onChange={(v) => set("contact.mapUrl", v)} max={500} placeholder="https://…" />
    </div>
  );
}

export function HeroSection({ c, set }: P) {
  const h = c.home;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField className="sm:col-span-2" label="تیتر بزرگ صفحه‌ی اول" value={h.heroTitle} onChange={(v) => set("home.heroTitle", v)} max={120} placeholder="مثلاً سفر بعدی‌ات را همین‌جا انتخاب کن" />
      <AreaField className="sm:col-span-2" label="زیرتیتر" value={h.heroSubtitle} onChange={(v) => set("home.heroSubtitle", v)} max={300} rows={2} />
      <TextField label="متن دکمه" value={h.heroCtaText} onChange={(v) => set("home.heroCtaText", v)} max={40} placeholder={`دیدن ${c.labels.itemPlural}`} />
      <TextField label="لینک دکمه" dir="ltr" value={h.heroCtaUrl} onChange={(v) => set("home.heroCtaUrl", v)} max={300} placeholder="/items" hint="/items صفحه‌ی آیتم‌ها، /services خدمات، /contact تماس" />
      <ImageField label="عکس پس‌زمینه" value={h.heroImageUrl} onChange={(v) => set("home.heroImageUrl", v)} hint="افقی و باکیفیت؛ حداقل ۱۶۰۰ پیکسل عرض." />
      <ImageField label="ویدیوی پس‌زمینه (اختیاری)" accept="video" value={h.heroVideoUrl} onChange={(v) => set("home.heroVideoUrl", v)} hint="MP4 کوتاه و بی‌صدا، حداکثر ۲۵ مگابایت. اگر بگذارید جای عکس پخش می‌شود." />
    </div>
  );
}

export function HomeMoreSection({ c, set }: P) {
  const h = c.home;
  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <SwitchRow label="بخش «چرا ما؟» (ویژگی‌ها)" checked={h.showHighlights} onChange={(v) => set("home.showHighlights", v)} />
        {h.showHighlights && (
          <>
            <TextField label="عنوان بخش" value={h.highlightsTitle} onChange={(v) => set("home.highlightsTitle", v)} max={80} />
            <ListEditor items={h.highlights} onChange={(v) => set("home.highlights", v)} max={8} addLabel="افزودن ویژگی"
              make={() => ({ title: "", text: "", icon: "check" })}
              render={(x, put) => (
                <div className="grid gap-3 sm:grid-cols-[160px_1fr_2fr]">
                  <Select value={x.icon ?? "check"} onValueChange={(v) => put({ ...x, icon: v })}>
                    <SelectTrigger aria-label="آیکن"><SiteIcon name={x.icon} className="size-4" /><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ICONS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={x.title} onChange={(e) => put({ ...x, title: e.target.value })} placeholder="عنوان" maxLength={60} aria-label="عنوان ویژگی" />
                  <Input value={x.text ?? ""} onChange={(e) => put({ ...x, text: e.target.value })} placeholder="توضیح کوتاه" maxLength={160} aria-label="توضیح ویژگی" />
                </div>
              )} />
          </>
        )}
      </section>
      <SwitchRow label={`بخش ${c.labels.itemPlural}ی ویژه`} hint="مواردی که در فرمشان «ویژه» زده‌اید." checked={h.showFeatured} onChange={(v) => set("home.showFeatured", v)} />
      {h.showFeatured && <TextField label="عنوان بخش ویژه" value={h.featuredTitle} onChange={(v) => set("home.featuredTitle", v)} max={80} />}
      <SwitchRow label="نمایش چند خدمت در صفحه‌ی اول" checked={h.showServices} onChange={(v) => set("home.showServices", v)} />
      <section className="grid gap-4">
        <SwitchRow label="بخش «درباره‌ی ما»" checked={h.showAbout} onChange={(v) => set("home.showAbout", v)} />
        {h.showAbout && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="عنوان" value={h.aboutTitle} onChange={(v) => set("home.aboutTitle", v)} max={80} />
            <ImageField label="عکس" value={h.aboutImageUrl} onChange={(v) => set("home.aboutImageUrl", v)} />
            <AreaField className="sm:col-span-2" label="متن" value={h.aboutText} onChange={(v) => set("home.aboutText", v)} max={3000} rows={5} />
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium">آمار (مثل «۱۰ سال تجربه»)</p>
              <ListEditor items={h.stats} onChange={(v) => set("home.stats", v)} max={6} addLabel="افزودن آمار" make={() => ({ value: "", label: "" })}
                render={(x, put) => (
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={x.value} onChange={(e) => put({ ...x, value: e.target.value })} placeholder="۱۰+" maxLength={20} aria-label="عدد" />
                    <Input value={x.label} onChange={(e) => put({ ...x, label: e.target.value })} placeholder="سال تجربه" maxLength={40} aria-label="عنوان آمار" />
                  </div>
                )} />
            </div>
          </div>
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="پرسش‌های متداول" checked={h.showFaq} onChange={(v) => set("home.showFaq", v)} />
        {h.showFaq && (
          <ListEditor items={h.faq} onChange={(v) => set("home.faq", v)} addLabel="افزودن پرسش" make={() => ({ question: "", answer: "" })}
            render={(x, put) => (
              <>
                <Input value={x.question} onChange={(e) => put({ ...x, question: e.target.value })} placeholder="پرسش" maxLength={160} aria-label="پرسش" />
                <textarea value={x.answer} onChange={(e) => put({ ...x, answer: e.target.value })} placeholder="پاسخ" maxLength={800} rows={2} aria-label="پاسخ" className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
              </>
            )} />
        )}
      </section>
      <section className="grid gap-4">
        <SwitchRow label="کادر دعوت به تماس (پایین صفحه)" checked={h.showCta} onChange={(v) => set("home.showCta", v)} />
        {h.showCta && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="عنوان" value={h.ctaTitle} onChange={(v) => set("home.ctaTitle", v)} max={80} />
            <TextField label="متن" value={h.ctaText} onChange={(v) => set("home.ctaText", v)} max={200} />
          </div>
        )}
      </section>
    </div>
  );
}

export function MenuSection({ c, set }: P) {
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <p className="text-sm font-medium">لینک‌های منوی بالا</p>
        <ListEditor items={c.nav} onChange={(v) => set("nav", v)} max={10} addLabel="افزودن لینک" make={() => ({ label: "", href: "/" })}
          render={(x, put) => (
            <div className="grid grid-cols-2 gap-3">
              <Input value={x.label} onChange={(e) => put({ ...x, label: e.target.value })} placeholder="عنوان" maxLength={30} aria-label="عنوان لینک" />
              <Input dir="ltr" value={x.href} onChange={(e) => put({ ...x, href: e.target.value })} placeholder="/items" maxLength={300} aria-label="آدرس لینک" />
            </div>
          )} />
        <p className="text-xs text-muted-foreground">آدرس‌های داخلی: / خانه · /items {c.labels.itemPlural} · /services خدمات · /contact تماس · /#about درباره‌ی ما</p>
      </section>
      <section className="grid gap-3">
        <p className="text-sm font-medium">صفحه‌های فعال</p>
        <SwitchRow label={`صفحه‌ی ${c.labels.itemPlural}`} checked={c.pages.items} onChange={(v) => set("pages.items", v)} />
        <SwitchRow label="صفحه‌ی خدمات و قیمت‌ها" checked={c.pages.services} onChange={(v) => set("pages.services", v)} />
        <SwitchRow label="صفحه‌ی تماس و فرم درخواست" checked={c.pages.contact} onChange={(v) => set("pages.contact", v)} />
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <AreaField className="sm:col-span-2" label="متن فوتر" value={c.footer.text} onChange={(v) => set("footer.text", v)} max={300} rows={2} />
        <TextField label="متن کپی‌رایت" value={c.footer.copyright} onChange={(v) => set("footer.copyright", v)} max={120} placeholder={`© ${c.brand.name}`} />
        <TextField label="عنوان سایت در گوگل" value={c.seo.title} onChange={(v) => set("seo.title", v)} max={70} placeholder={c.brand.name} />
        <AreaField className="sm:col-span-2" label="توضیح سایت در گوگل" value={c.seo.description} onChange={(v) => set("seo.description", v)} max={160} rows={2} />
      </section>
    </div>
  );
}

export function CatalogSection({ c, set }: P) {
  const L = c.labels;
  return (
    <div className="grid gap-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <TextField label="اسم هر مورد (مفرد)" value={L.itemSingular} onChange={(v) => set("labels.itemSingular", v)} max={30} placeholder="تور / خودرو / محصول" />
        <TextField label="اسم جمع" value={L.itemPlural} onChange={(v) => set("labels.itemPlural", v)} max={30} placeholder="تورها" />
        <TextField label="عنوان صفحه‌ی لیست" value={L.itemsPageTitle} onChange={(v) => set("labels.itemsPageTitle", v)} max={60} />
        <TextField label="متن دکمه‌ی درخواست" value={L.requestButton} onChange={(v) => set("labels.requestButton", v)} max={30} placeholder="رزرو تور" />
        <TextField label="برچسب «ناموجود»" value={L.soldOutLabel} onChange={(v) => set("labels.soldOutLabel", v)} max={30} placeholder="تکمیل ظرفیت" />
        <TextField label="عنوان صفحه‌ی خدمات" value={L.servicesTitle} onChange={(v) => set("labels.servicesTitle", v)} max={60} />
      </section>
      <section className="grid gap-3">
        <p className="text-sm font-medium">دسته‌ها <span className="text-xs text-muted-foreground">(بالای صفحه‌ی لیست به‌صورت دکمه نمایش داده می‌شوند)</span></p>
        <ListEditor items={c.categories} onChange={(v) => set("categories", v)} max={30} addLabel="افزودن دسته" make={() => ""}
          render={(x, put) => <Input value={x} onChange={(e) => put(e.target.value)} placeholder="مثلاً تور خارجی" maxLength={60} aria-label="نام دسته" />} />
      </section>
      <section className="grid gap-3">
        <p className="text-sm font-medium">فیلدهای اختصاصی هر مورد</p>
        <p className="text-xs text-muted-foreground">مثلاً برای تور: مقصد، مدت، هتل. برای خودرو: سال، کارکرد. فیلد «انتخابی» می‌تواند فیلتر صفحه‌ی لیست هم باشد.</p>
        <ListEditor items={c.fields} onChange={(v) => set("fields", v)} max={12} addLabel="افزودن فیلد"
          make={(): FieldDef => ({ key: `f${c.fields.length + 1}`, label: "", type: "text", options: [], suffix: null, showOnCard: false, filter: false })}
          render={(f, put) => (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
                <Input value={f.label} onChange={(e) => put({ ...f, label: e.target.value })} placeholder="عنوان فیلد (مثلاً مقصد)" maxLength={40} aria-label="عنوان فیلد" />
                <Select value={f.type} onValueChange={(v) => put({ ...f, type: v as FieldDef["type"] })}>
                  <SelectTrigger aria-label="نوع فیلد"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="text">متن</SelectItem><SelectItem value="number">عدد</SelectItem><SelectItem value="select">انتخابی</SelectItem></SelectContent>
                </Select>
                <Input dir="ltr" value={f.key} onChange={(e) => put({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30) })} placeholder="key" aria-label="کلید فنی (انگلیسی)" title="کلید فنی؛ بعد از ثبت آیتم‌ها عوضش نکنید" />
              </div>
              {f.type === "select" && (
                <Input value={f.options.join("، ")} onChange={(e) => put({ ...f, options: e.target.value.split(/[،,]/).map((o) => o.trim()).filter(Boolean) })} placeholder="گزینه‌ها با ویرگول: هوایی، زمینی" aria-label="گزینه‌ها" />
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {f.type === "number" && <Input className="h-9 w-40" value={f.suffix ?? ""} onChange={(e) => put({ ...f, suffix: e.target.value || null })} placeholder="واحد (کیلومتر)" aria-label="واحد" />}
                <label className="flex items-center gap-2"><input type="checkbox" checked={f.showOnCard} onChange={(e) => put({ ...f, showOnCard: e.target.checked })} />نمایش روی کارت</label>
                {f.type === "select" && <label className="flex items-center gap-2"><input type="checkbox" checked={f.filter} onChange={(e) => put({ ...f, filter: e.target.checked })} />فیلتر در صفحه‌ی لیست</label>}
              </div>
            </>
          )} />
      </section>
    </div>
  );
}

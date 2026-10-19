"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminHeader } from "@/components/app/admin-page";
import { BrandSection, CatalogSection, ContactSection, HeroSection, HomeMoreSection, LookSection, MenuSection } from "@/components/admin/site-sections";
import { patch, useAdminSite } from "@/lib/admin-site";
import type { SiteContent } from "@/lib/site";

const TABS = [
  ["brand", "نام و لوگو"],
  ["look", "رنگ و ظاهر"],
  ["home", "صفحه‌ی اول"],
  ["contact", "تماس"],
  ["catalog", "آیتم‌ها و فیلدها"],
  ["menu", "منو و صفحه‌ها"],
] as const;

function SiteSettings() {
  const { site, save } = useAdminSite();
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") ?? "brand";
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (site) setDraft(site.content); }, [site]);
  const dirty = !!site && !!draft && JSON.stringify(site.content) !== JSON.stringify(draft);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  if (!site || !draft) return <Skeleton className="h-96 w-full rounded-2xl" />;
  const set = (path: string, v: unknown) => setDraft((d) => (d ? patch(d, path, v) : d));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await save(draft);
      toast.success("ذخیره شد و در سایت اعمال شد.");
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminHeader title="تنظیمات سایت" description="همه‌ی متن‌ها، رنگ‌ها و بخش‌های سایت از اینجا عوض می‌شود."
        actions={<Button asChild variant="outline"><a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />مشاهده‌ی سایت</a></Button>} />
      <Tabs value={tab} onValueChange={(v) => router.replace(`/admin/site?tab=${v}`, { scroll: false })} dir="rtl">
        <div className="-mx-4 mb-6 overflow-x-auto px-4">
          <TabsList className="h-auto w-max">
            {TABS.map(([k, l]) => <TabsTrigger key={k} value={k} className="px-4 py-2.5 text-[15px]">{l}</TabsTrigger>)}
          </TabsList>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <TabsContent value="brand"><BrandSection c={draft} set={set} /></TabsContent>
          <TabsContent value="look"><LookSection c={draft} set={set} /></TabsContent>
          <TabsContent value="home"><div className="grid gap-10"><HeroSection c={draft} set={set} /><HomeMoreSection c={draft} set={set} /></div></TabsContent>
          <TabsContent value="contact"><ContactSection c={draft} set={set} /></TabsContent>
          <TabsContent value="catalog"><CatalogSection c={draft} set={set} /></TabsContent>
          <TabsContent value="menu"><MenuSection c={draft} set={set} /></TabsContent>
        </div>
      </Tabs>
      <div className="sticky bottom-20 z-30 mt-6 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-border bg-background/90 p-3 backdrop-blur">
        {error && <p role="alert" className="me-auto text-sm text-destructive">{error}</p>}
        {dirty && !error && <p className="me-auto text-sm text-muted-foreground">تغییرات ذخیره نشده دارید.</p>}
        <Button variant="ghost" disabled={!dirty || busy} onClick={() => setDraft(site.content)}>لغو تغییرات</Button>
        <Button onClick={() => void submit()} disabled={!dirty || busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}ذخیره</Button>
      </div>
    </>
  );
}

export default function SiteSettingsPage() {
  return <Suspense><SiteSettings /></Suspense>;
}

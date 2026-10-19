"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, EyeOff, Loader2, RotateCcw, Upload, WandSparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminHeader } from "@/components/app/admin-page";
import { Skeleton } from "@/components/ui/skeleton";
import { apiSend, authFetch } from "@/lib/api";
import { useAdminSite } from "@/lib/admin-site";

type Confirm = { title: string; text: string; action: () => Promise<void>; danger?: boolean } | null;

export default function PublishPage() {
  const { site, reload } = useAdminSite();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [resetMode, setResetMode] = useState("blank");
  const [resetPreset, setResetPreset] = useState("");
  const file = useRef<HTMLInputElement>(null);
  if (!site) return <Skeleton className="h-96 w-full rounded-2xl" />;

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      await reload();
      toast.success(ok);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const exportPackage = () => run("export", async () => {
    const res = await authFetch("/api/v1/admin/site/export");
    if (!res.ok) throw new Error("دریافت فایل انجام نشد.");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(site.content.brand.name || "site").replace(/\s+/g, "-")}-content.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "فایل محتوا دانلود شد.");

  const importPackage = async (f: File | undefined) => {
    if (!f) return;
    let pkg: unknown;
    try { pkg = JSON.parse(await f.text()); } catch { toast.error("این فایل JSON معتبر نیست."); return; }
    setConfirm({
      title: "جایگزینی همه‌ی محتوا؟",
      text: "تنظیمات، آیتم‌ها و خدمات فعلی با محتوای این فایل جایگزین می‌شوند. درخواست‌ها و کاربران دست نمی‌خورند. پیشنهاد: اول از محتوای فعلی خروجی بگیرید.",
      danger: true,
      action: () => run("import", () => apiSend("/api/v1/admin/site/import", "POST", pkg), "محتوا وارد شد."),
    });
    if (file.current) file.current.value = "";
  };

  const preset = resetPreset || site.preset;
  const card = "rounded-2xl border border-border bg-card p-5 sm:p-6";

  return (
    <>
      <AdminHeader title="انتشار و پشتیبان" description="منتشر کردن سایت، گرفتن خروجی از محتوا و شروع دوباره." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-bold">{site.isPublished ? <Eye className="size-5 text-emerald-500" /> : <EyeOff className="size-5" />}وضعیت انتشار</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {site.isPublished ? "سایت برای همه قابل دیدن است." : "سایت منتشر نشده؛ بازدیدکننده‌ها صفحه‌ی «به‌زودی» را می‌بینند و فقط شما (مدیر و کارمندان) سایت واقعی را می‌بینید."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => void run("pub", () => apiSend("/api/v1/admin/site/publish", "POST", { published: !site.isPublished }), site.isPublished ? "سایت از دسترس عموم خارج شد." : "سایت منتشر شد!")}
              variant={site.isPublished ? "outline" : "default"} disabled={!!busy}>
              {busy === "pub" && <Loader2 className="size-4 animate-spin" />}{site.isPublished ? "پنهان کردن سایت (به‌زودی)" : "انتشار سایت"}
            </Button>
            <Button asChild variant="ghost"><a href="/" target="_blank" rel="noopener noreferrer">پیش‌نمایش</a></Button>
          </div>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Download className="size-5" />خروجی و ورود محتوا</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            همه‌ی تنظیمات، آیتم‌ها و خدمات در یک فایل. برای پشتیبان‌گیری، یا برای اینکه سایتی که آماده کرده‌اید را روی سایت یک مشتری دیگر بریزید.
            عکس‌های آپلودی داخل فایل نیستند و از همین سرور خوانده می‌شوند؛ برای انتقال به سرور دیگر، عکس‌ها را با لینک (https) بگذارید.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void exportPackage()} disabled={!!busy}>{busy === "export" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}دانلود فایل محتوا</Button>
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void importPackage(e.target.files?.[0])} aria-label="انتخاب فایل محتوا" />
            <Button variant="outline" onClick={() => file.current?.click()} disabled={!!busy}>{busy === "import" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}وارد کردن فایل</Button>
          </div>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><WandSparkles className="size-5" />دستیار راه‌اندازی</h2>
          <p className="mt-2 text-sm text-muted-foreground">دستیار را از اول نشان بده (چیزی پاک نمی‌شود).</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/admin/setup">باز کردن دستیار</Link></Button>
            <Button variant="ghost" onClick={() => void run("restart", () => apiSend("/api/v1/admin/site/setup/restart", "POST"), "دستیار از اول شروع می‌شود.")} disabled={!!busy}>شروع دوباره‌ی مراحل</Button>
          </div>
        </section>

        <section className={`${card} border-destructive/40`}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><RotateCcw className="size-5" />شروع از صفر</h2>
          <p className="mt-2 text-sm text-muted-foreground">همه‌ی آیتم‌ها، خدمات و تنظیمات پاک می‌شوند. «خام» برای تحویل به مشتری، «نمونه» برای نمایش دمو.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Select value={resetMode} onValueChange={setResetMode}>
              <SelectTrigger aria-label="حالت"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="blank">خام (بدون داده + دستیار)</SelectItem><SelectItem value="demo">با محتوای نمونه</SelectItem></SelectContent>
            </Select>
            <Select value={preset} onValueChange={setResetPreset}>
              <SelectTrigger aria-label="نوع کسب‌وکار"><SelectValue /></SelectTrigger>
              <SelectContent>{site.presets.map((p) => <SelectItem key={p.key} value={p.key}>{p.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="mt-4" variant="destructive" disabled={!!busy} onClick={() => setConfirm({
            title: "همه‌چیز پاک شود؟", danger: true,
            text: "آیتم‌ها، خدمات و تنظیمات فعلی پاک می‌شوند و قابل برگشت نیستند (مگر از فایل محتوا). درخواست‌ها و کاربران می‌مانند.",
            action: () => run("reset", () => apiSend("/api/v1/admin/site/reset", "POST", { mode: resetMode, preset }), resetMode === "demo" ? "سایت با محتوای نمونه ساخته شد." : "سایت خالی شد؛ دستیار را دنبال کنید."),
          })}>شروع از صفر</Button>
        </section>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className={confirm?.danger ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} onClick={() => { const a = confirm?.action; setConfirm(null); void a?.(); }}>تأیید</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

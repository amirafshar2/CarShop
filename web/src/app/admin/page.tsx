"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Eye, EyeOff, Inbox, LayoutGrid, Sparkles, Users, WandSparkles } from "lucide-react";
import StatisticCard7, { type StatCard } from "@/components/ui/statistics-card-7";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminHeader, LoadState, StatusPill } from "@/components/app/admin-page";
import type { DashboardStats } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fa } from "@/lib/format";
import { faDate, leadStatusColor, leadStatusLabels, leadTypeLabels } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { isAdmin } from "@/lib/api";
import { useAdminSite } from "@/lib/admin-site";
import { setupSteps } from "@/lib/setup-steps";

export default function AdminDashboard() {
  const { user } = useSession();
  const { data, error, loading, reload } = useApi<DashboardStats>("/api/v1/admin/stats");
  const { site } = useAdminSite();
  const router = useRouter();
  const admin = isAdmin(user);
  const L = site?.content.labels;

  // Very first visit of a fresh site: open the assistant straight away.
  useEffect(() => {
    if (admin && site && !site.setupCompleted && site.completedSteps.length === 0) router.replace("/admin/setup");
  }, [admin, site, router]);

  const steps = setupSteps(site);
  const done = site ? steps.filter((s) => s.done(site)).length : 0;

  const cards: StatCard[] = data
    ? [
        {
          title: `${L?.itemPlural ?? "آیتم‌ها"}ی منتشرشده`, subtitle: "در سایت", value: fa(data.listingsPublished), valueColor: "text-emerald-500",
          badge: { color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", icon: LayoutGrid, text: `${fa(data.listingsSoldOut)} ${L?.soldOutLabel ?? "ناموجود"}` },
          subtext: <span className="text-muted-foreground">{fa(data.listingsDraft + data.listingsHidden)} پنهان/پیش‌نویس</span>,
        },
        {
          title: "درخواست‌های جدید", subtitle: "منتظر تماس", value: fa(data.leadsNew), valueColor: "text-primary",
          badge: { color: "bg-primary/15 text-primary", icon: Inbox, text: `${fa(data.leadsTotal)} کل` },
          subtext: <Link href="/admin/leads" className="font-medium text-primary hover:underline">مشاهده‌ی درخواست‌ها</Link>,
        },
        {
          title: "مشتریان و خدمات", subtitle: "حساب‌های ثبت‌نام‌شده", value: fa(data.customers), valueColor: "text-violet-500",
          badge: { color: "bg-violet-500/15 text-violet-600 dark:text-violet-300", icon: Users, text: `${fa(data.activeServices)} خدمت` },
          subtext: <Link href="/admin/services" className="font-medium text-primary hover:underline">ویرایش قیمت خدمات</Link>,
        },
      ]
    : [];

  return (
    <>
      <AdminHeader
        title={`سلام${user?.fullName ? ` ${user.fullName}` : ""}`}
        description={site ? `خلاصه‌ی وضعیت ${site.content.brand.name || "سایت"}` : undefined}
        actions={
          <>
            <Button asChild><Link href="/admin/items/new">{`+ افزودن ${L?.itemSingular ?? "آیتم"}`}</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/services"><Sparkles className="me-2 size-4" />خدمات و قیمت‌ها</Link></Button>
          </>
        }
      />
      {admin && site && done < steps.length && (
        <section className="mb-8 rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-6" aria-labelledby="setup-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="setup-card" className="flex items-center gap-2 text-lg font-bold"><WandSparkles className="size-5 text-primary" aria-hidden />سایت شما تقریباً آماده است</h2>
              <p className="mt-1 text-sm text-muted-foreground">{`${fa(done)} از ${fa(steps.length)} مرحله انجام شده. دستیار قدم‌به‌قدم کمکتان می‌کند.`}</p>
            </div>
            <Button asChild><Link href="/admin/setup">ادامه‌ی راه‌اندازی</Link></Button>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.key}>
                <Link href={`/admin/setup?step=${s.key}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                  {s.done(site) ? <CheckCircle2 className="size-4 text-emerald-500" aria-hidden /> : <Circle className="size-4 text-muted-foreground" aria-hidden />}
                  <span className={s.done(site) ? "text-muted-foreground" : "font-medium"}>{s.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {admin && site && (
        <div className={`mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${site.isPublished ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card"}`}>
          <p className="flex items-center gap-2 text-sm font-medium">
            {site.isPublished ? <Eye className="size-4 text-emerald-500" aria-hidden /> : <EyeOff className="size-4 text-muted-foreground" aria-hidden />}
            {site.isPublished ? "سایت منتشر شده و برای همه قابل دیدن است." : "سایت هنوز منتشر نشده؛ بازدیدکننده‌ها صفحه‌ی «به‌زودی» را می‌بینند."}
          </p>
          <Button asChild variant="outline" size="sm"><Link href="/admin/publish">{site.isPublished ? "مدیریت انتشار" : "انتشار سایت"}</Link></Button>
        </div>
      )}
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <div className="space-y-10">
          <StatisticCard7 cards={cards} />
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">آخرین درخواست‌ها</h2>
              <Button asChild variant="ghost"><Link href="/admin/leads">همه</Link></Button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>موبایل</TableHead>
                    <TableHead>نوع</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>زمان</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentLeads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell dir="ltr" className="text-end"><a href={`tel:${l.phone}`} className="hover:text-primary">{l.phone}</a></TableCell>
                      <TableCell>{leadTypeLabels[l.type]}</TableCell>
                      <TableCell><StatusPill className={leadStatusColor[l.status]}>{leadStatusLabels[l.status]}</StatusPill></TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{faDate(l.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {data.recentLeads.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">هنوز درخواستی ثبت نشده است.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

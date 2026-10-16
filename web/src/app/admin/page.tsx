"use client";

import Link from "next/link";
import { ArrowUpRight, Car, Inbox, Sparkles, Users } from "lucide-react";
import StatisticCard7, { type StatCard } from "@/components/ui/statistics-card-7";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminHeader, LoadState, StatusPill } from "@/components/app/admin-page";
import type { DashboardStats } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fa } from "@/lib/format";
import { faDate, leadStatusColor, leadStatusLabels, leadTypeLabels } from "@/lib/labels";
import { useSession } from "@/lib/session";

export default function AdminDashboard() {
  const { user } = useSession();
  const { data, error, loading, reload } = useApi<DashboardStats>("/api/v1/admin/stats");

  const cards: StatCard[] = data
    ? [
        {
          title: "خودروهای منتشرشده", subtitle: "در حال فروش", value: fa(data.carsAvailable), valueColor: "text-emerald-400",
          badge: { color: "bg-emerald-950 text-emerald-300", icon: Car, text: `${fa(data.carsReserved)} رزرو` },
          subtext: <span className="text-muted-foreground">{fa(data.carsSold)} فروخته‌شده · {fa(data.carsHidden + data.carsDraft)} پنهان/پیش‌نویس</span>,
        },
        {
          title: "درخواست‌های جدید", subtitle: "منتظر تماس", value: fa(data.leadsNew), valueColor: "text-primary",
          badge: { color: "bg-orange-950 text-orange-300", icon: Inbox, text: `${fa(data.leadsTotal)} کل` },
          subtext: <Link href="/admin/leads" className="font-medium text-primary hover:underline">مشاهده‌ی درخواست‌ها</Link>,
        },
        {
          title: "رزروهای فعال", subtitle: "با بیعانه", value: fa(data.activeReservations), valueColor: "text-sky-400",
          badge: { color: "bg-sky-950 text-sky-300", icon: ArrowUpRight, text: "۴۸ ساعته" },
          subtext: <span className="text-muted-foreground">خودکار آزاد می‌شوند</span>,
        },
        {
          title: "مشتریان و خدمات", subtitle: "حساب‌های ثبت‌نام‌شده", value: fa(data.customers), valueColor: "text-violet-300",
          badge: { color: "bg-violet-950 text-violet-300", icon: Users, text: `${fa(data.activeServices)} خدمت` },
          subtext: <Link href="/admin/services" className="font-medium text-primary hover:underline">ویرایش قیمت خدمات</Link>,
        },
      ]
    : [];

  return (
    <>
      <AdminHeader
        title={`سلام${user?.fullName ? ` ${user.fullName}` : ""} 👋`}
        description="خلاصه‌ی وضعیت نمایشگاه"
        actions={
          <>
            <Button asChild><Link href="/admin/cars/new">+ افزودن خودرو</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/services"><Sparkles className="me-2 size-4" />خدمات و قیمت‌ها</Link></Button>
          </>
        }
      />
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

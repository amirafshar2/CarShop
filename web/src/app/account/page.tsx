"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Car, Inbox, LogOut, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadState, StatusPill } from "@/components/app/admin-page";
import { apiSend, isStaff, logout, type Me, type MyLead, type MyReservation } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import { toman } from "@/lib/format";
import { faDate, leadStatusColor, leadStatusLabels, leadTypeLabels, reservationStatusLabels } from "@/lib/labels";

const resColor: Record<string, string> = {
  Active: "bg-primary/15 text-primary border-primary/40",
  Converted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  Expired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",
  Cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",
};

export default function AccountPage() {
  const { user, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/account");
  }, [ready, user, router]);

  const enabled = ready && !!user;
  const me = useApi<Me>(enabled ? "/api/v1/me" : null);
  const reservations = useApi<MyReservation[]>(enabled ? "/api/v1/me/reservations" : null);
  const leads = useApi<MyLead[]>(enabled ? "/api/v1/me/leads" : null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState<MyReservation | null>(null);

  useEffect(() => {
    if (me.data) setName(me.data.fullName ?? "");
  }, [me.data]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiSend("/api/v1/me", "PUT", { fullName: name });
      toast.success("پروفایل ذخیره شد.");
      await me.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!cancelling) return;
    try {
      await apiSend(`/api/v1/me/reservations/${cancelling.id}/cancel`, "POST");
      toast.success("رزرو لغو شد.");
      await reservations.reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setCancelling(null);
  };

  if (!enabled) return <div className="mx-auto max-w-5xl px-4 pb-24 pt-36"><LoadState loading error={null} /></div>;

  const active = reservations.data?.find((r) => r.status === "Active");

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-36">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">حساب کاربری</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">سلام{user.fullName ? ` ${user.fullName}` : ""}</h1>
          <p className="mt-2 text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>{user.phone}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStaff(user) && <Button asChild><Link href="/admin"><ShieldCheck className="me-1.5 size-4" />پنل مدیریت</Link></Button>}
          <Button variant="outline" onClick={async () => { await logout(); router.replace("/"); }}><LogOut className="me-1.5 size-4" />خروج</Button>
        </div>
      </header>

      {active && (
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-primary">رزرو فعال شما</p>
              <p className="mt-1 text-xl font-bold">{active.carTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">تا {faDate(active.expiresAt)} برای شما نگه داشته می‌شود · بیعانه {toman(active.depositRial)}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link href={`/cars/${active.carSlug}`}>مشاهده‌ی خودرو</Link></Button>
              <Button asChild><Link href={`/contact?type=VisitRequest&car=${active.carId}`}>هماهنگی بازدید</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="reservations" dir="rtl">
        <TabsList className="mb-6 h-auto flex-wrap">
          <TabsTrigger value="reservations" className="gap-2 px-4 py-2.5 text-[15px]"><Car className="size-4" />رزروهای من</TabsTrigger>
          <TabsTrigger value="leads" className="gap-2 px-4 py-2.5 text-[15px]"><Inbox className="size-4" />درخواست‌های من</TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 px-4 py-2.5 text-[15px]"><Settings className="size-4" />پروفایل</TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="space-y-3">
          <LoadState loading={reservations.loading && !reservations.data} error={reservations.error} onRetry={reservations.reload} />
          {reservations.data?.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              هنوز خودرویی رزرو نکرده‌اید. <Link href="/inventory" className="font-semibold text-primary hover:underline">مشاهده‌ی موجودی</Link>
            </CardContent></Card>
          )}
          {reservations.data?.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent"><CalendarClock className="size-5 text-primary" /></span>
                  <div>
                    <Link href={`/cars/${r.carSlug}`} className="text-lg font-bold hover:text-primary">{r.carTitle}</Link>
                    <p className="text-sm text-muted-foreground">رزرو: {faDate(r.reservedAt)} · بیعانه {toman(r.depositRial)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill className={resColor[r.status]}>{reservationStatusLabels[r.status]}</StatusPill>
                  {r.status === "Active" && <Button variant="outline" size="sm" onClick={() => setCancelling(r)}>لغو رزرو</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="leads" className="space-y-3">
          <LoadState loading={leads.loading && !leads.data} error={leads.error} onRetry={leads.reload} />
          {leads.data?.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              درخواستی با شماره‌ی شما ثبت نشده است. <Link href="/contact" className="font-semibold text-primary hover:underline">ثبت درخواست</Link>
            </CardContent></Card>
          )}
          {leads.data?.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold">{leadTypeLabels[l.type]}{l.carTitle ? ` — ${l.carTitle}` : ""}</p>
                  {l.message && <p className="mt-1 text-sm text-muted-foreground">{l.message}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{faDate(l.createdAt)}</p>
                </div>
                <StatusPill className={leadStatusColor[l.status]}>{leadStatusLabels[l.status]}</StatusPill>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="profile">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>پروفایل</CardTitle>
              <CardDescription>شماره‌ی موبایل شناسه‌ی ورود شماست و قابل تغییر نیست.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveProfile(); }}>
                <div className="grid gap-2"><Label htmlFor="p-name">نام و نام خانوادگی</Label><Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
                <div className="grid gap-2"><Label htmlFor="p-phone">شماره موبایل</Label><Input id="p-phone" dir="ltr" value={user.phone} disabled /></div>
                <Button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>رزرو «{cancelling?.carTitle}» لغو شود؟</AlertDialogTitle>
            <AlertDialogDescription>خودرو دوباره برای فروش آزاد می‌شود. برای بازگشت بیعانه کارشناس ما با شما تماس می‌گیرد.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>منصرف شدم</AlertDialogCancel>
            <AlertDialogAction onClick={() => void cancel()}>لغو رزرو</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Inbox, LogOut, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadState, StatusPill } from "@/components/app/admin-page";
import { apiSend, isStaff, logout, type Me, type MyLead } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import { faDate, leadStatusColor, leadStatusLabels, leadTypeLabels } from "@/lib/labels";

export default function AccountPage() {
  const { user, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/account");
  }, [ready, user, router]);

  const enabled = ready && !!user;
  const me = useApi<Me>(enabled ? "/api/v1/me" : null);
  const leads = useApi<MyLead[]>(enabled ? "/api/v1/me/leads" : null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

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

  if (!enabled) return <div className="mx-auto max-w-5xl px-4 pb-24 pt-36"><LoadState loading error={null} /></div>;

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

      <Tabs defaultValue="leads" dir="rtl">
        <TabsList className="mb-6 h-auto flex-wrap">
          <TabsTrigger value="leads" className="gap-2 px-4 py-2.5 text-[15px]"><Inbox className="size-4" />درخواست‌های من</TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 px-4 py-2.5 text-[15px]"><Settings className="size-4" />پروفایل</TabsTrigger>
        </TabsList>

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
                  <p className="font-bold">{leadTypeLabels[l.type]}{l.listingTitle ? ` — ${l.listingTitle}` : ""}</p>
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

    </div>
  );
}

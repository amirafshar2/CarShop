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
      toast.success("Profil gespeichert.");
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
          <p className="text-sm font-semibold text-primary">Benutzerkonto</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Hallo{user.fullName ? ` ${user.fullName}` : ""}</h1>
          <p className="mt-2 text-muted-foreground">{user.phone}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStaff(user) && <Button asChild><Link href="/admin"><ShieldCheck className="me-1.5 size-4" />Admin-Panel</Link></Button>}
          <Button variant="outline" onClick={async () => { await logout(); router.replace("/"); }}><LogOut className="me-1.5 size-4" />Abmelden</Button>
        </div>
      </header>

      <Tabs defaultValue="leads">
        <TabsList className="mb-6 h-auto flex-wrap">
          <TabsTrigger value="leads" className="gap-2 px-4 py-2.5 text-[15px]"><Inbox className="size-4" />Meine Anfragen</TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 px-4 py-2.5 text-[15px]"><Settings className="size-4" />Profil</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-3">
          <LoadState loading={leads.loading && !leads.data} error={leads.error} onRetry={leads.reload} />
          {leads.data?.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              Mit Ihrer Nummer wurde noch keine Anfrage gesendet. <Link href="/contact" className="font-semibold text-primary hover:underline">Anfrage senden</Link>
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
              <CardTitle>Profil</CardTitle>
              <CardDescription>Die Handynummer ist Ihre Anmeldekennung und kann nicht geändert werden.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveProfile(); }}>
                <div className="grid gap-2"><Label htmlFor="p-name">Vor- und Nachname</Label><Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
                <div className="grid gap-2"><Label htmlFor="p-phone">Handynummer</Label><Input id="p-phone" dir="ltr" value={user.phone} disabled /></div>
                <Button type="submit" disabled={saving}>{saving ? "Wird gespeichert…" : "Speichern"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

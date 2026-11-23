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
          title: `${L?.itemPlural ?? "Einträge"} (veröffentlicht)`, subtitle: "auf der Website", value: fa(data.listingsPublished), valueColor: "text-emerald-500",
          badge: { color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", icon: LayoutGrid, text: `${fa(data.listingsSoldOut)} ${L?.soldOutLabel ?? "Nicht verfügbar"}` },
          subtext: <span className="text-muted-foreground">{fa(data.listingsDraft + data.listingsHidden)} versteckt/Entwurf</span>,
        },
        {
          title: "Neue Anfragen", subtitle: "warten auf Rückruf", value: fa(data.leadsNew), valueColor: "text-primary",
          badge: { color: "bg-primary/15 text-primary", icon: Inbox, text: `${fa(data.leadsTotal)} gesamt` },
          subtext: <Link href="/admin/leads" className="font-medium text-primary hover:underline">Anfragen ansehen</Link>,
        },
        {
          title: "Kunden und Leistungen", subtitle: "registrierte Konten", value: fa(data.customers), valueColor: "text-violet-500",
          badge: { color: "bg-violet-500/15 text-violet-600 dark:text-violet-300", icon: Users, text: `${fa(data.activeServices)} Leistung` },
          subtext: <Link href="/admin/services" className="font-medium text-primary hover:underline">Preise der Leistungen bearbeiten</Link>,
        },
      ]
    : [];

  return (
    <>
      <AdminHeader
        title={`Hallo${user?.fullName ? ` ${user.fullName}` : ""}`}
        description={site ? `Überblick: ${site.content.brand.name || "Website"}` : undefined}
        actions={
          <>
            <Button asChild><Link href="/admin/items/new">{`+ Neu: ${L?.itemSingular ?? "Eintrag"}`}</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/services"><Sparkles className="me-2 size-4" />Leistungen und Preise</Link></Button>
          </>
        }
      />
      {admin && site && done < steps.length && (
        <section className="mb-8 rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-6" aria-labelledby="setup-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="setup-card" className="flex items-center gap-2 text-lg font-bold"><WandSparkles className="size-5 text-primary" aria-hidden />Ihre Website ist fast fertig</h2>
              <p className="mt-1 text-sm text-muted-foreground">{`${fa(done)} von ${fa(steps.length)} Schritte erledigt. Der Assistent hilft Ihnen Schritt für Schritt.`}</p>
            </div>
            <Button asChild><Link href="/admin/setup">Einrichtung fortsetzen</Link></Button>
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
            {site.isPublished ? "Die Website ist veröffentlicht und für alle sichtbar." : "Die Website ist noch nicht veröffentlicht; Besucher sehen die Seite „Bald für Sie da“."}
          </p>
          <Button asChild variant="outline" size="sm"><Link href="/admin/publish">{site.isPublished ? "Veröffentlichung verwalten" : "Website veröffentlichen"}</Link></Button>
        </div>
      )}
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <div className="space-y-10">
          <StatisticCard7 cards={cards} />
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Neueste Anfragen</h2>
              <Button asChild variant="ghost"><Link href="/admin/leads">Alle</Link></Button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobil</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Zeit</TableHead>
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
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Noch keine Anfragen eingegangen.</TableCell></TableRow>
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

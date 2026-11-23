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
    if (!res.ok) throw new Error("Die Datei konnte nicht heruntergeladen werden.");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(site.content.brand.name || "site").replace(/\s+/g, "-")}-content.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "Inhaltsdatei heruntergeladen.");

  const importPackage = async (f: File | undefined) => {
    if (!f) return;
    let pkg: unknown;
    try { pkg = JSON.parse(await f.text()); } catch { toast.error("Diese JSON-Datei ist ungültig."); return; }
    setConfirm({
      title: "Gesamten Inhalt ersetzen?",
      text: "Einstellungen, Einträge und Leistungen werden durch den Inhalt dieser Datei ersetzt. Anfragen und Benutzer bleiben erhalten. Tipp: Exportieren Sie vorher den aktuellen Inhalt.",
      danger: true,
      action: () => run("import", () => apiSend("/api/v1/admin/site/import", "POST", pkg), "Inhalt importiert."),
    });
    if (file.current) file.current.value = "";
  };

  const preset = resetPreset || site.preset;
  const card = "rounded-2xl border border-border bg-card p-5 sm:p-6";

  return (
    <>
      <AdminHeader title="Veröffentlichung und Backup" description="Website veröffentlichen, Inhalte exportieren und neu beginnen." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-bold">{site.isPublished ? <Eye className="size-5 text-emerald-500" /> : <EyeOff className="size-5" />}Veröffentlichungsstatus</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {site.isPublished ? "Die Website ist für alle sichtbar." : "Die Website ist nicht veröffentlicht; Besucher sehen „Bald für Sie da“, nur Sie (Admin und Mitarbeiter) sehen die echte Website."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => void run("pub", () => apiSend("/api/v1/admin/site/publish", "POST", { published: !site.isPublished }), site.isPublished ? "Die Website ist nicht mehr öffentlich." : "Die Website ist veröffentlicht!")}
              variant={site.isPublished ? "outline" : "default"} disabled={!!busy}>
              {busy === "pub" && <Loader2 className="size-4 animate-spin" />}{site.isPublished ? "Website verbergen (Bald für Sie da)" : "Website veröffentlichen"}
            </Button>
            <Button asChild variant="ghost"><a href="/" target="_blank" rel="noopener noreferrer">Vorschau</a></Button>
          </div>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Download className="size-5" />Inhalte exportieren und importieren</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Alle Einstellungen, Einträge und Leistungen in einer Datei – als Backup oder um eine fertige Website auf die Seite eines anderen Kunden zu übertragen.
            Hochgeladene Bilder sind nicht in der Datei enthalten, sondern werden von diesem Server geladen; für einen Umzug auf einen anderen Server Bilder als Link (https) einfügen.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void exportPackage()} disabled={!!busy}>{busy === "export" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Inhaltsdatei herunterladen</Button>
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void importPackage(e.target.files?.[0])} aria-label="Inhaltsdatei auswählen" />
            <Button variant="outline" onClick={() => file.current?.click()} disabled={!!busy}>{busy === "import" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}Datei importieren</Button>
          </div>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><WandSparkles className="size-5" />Einrichtungsassistent</h2>
          <p className="mt-2 text-sm text-muted-foreground">Den Assistenten von vorn zeigen (es wird nichts gelöscht).</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/admin/setup">Assistent öffnen</Link></Button>
            <Button variant="ghost" onClick={() => void run("restart", () => apiSend("/api/v1/admin/site/setup/restart", "POST"), "Der Assistent beginnt von vorn.")} disabled={!!busy}>Schritte neu starten</Button>
          </div>
        </section>

        <section className={`${card} border-destructive/40`}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><RotateCcw className="size-5" />Von null beginnen</h2>
          <p className="mt-2 text-sm text-muted-foreground">Alle Einträge, Leistungen und Einstellungen werden gelöscht. „Leer“ für die Übergabe an einen Kunden, „Beispiel“ für eine Demo.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Select value={resetMode} onValueChange={setResetMode}>
              <SelectTrigger aria-label="Modus"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="blank">Leer (ohne Daten + Assistent)</SelectItem><SelectItem value="demo">Mit Beispielinhalt</SelectItem></SelectContent>
            </Select>
            <Select value={preset} onValueChange={setResetPreset}>
              <SelectTrigger aria-label="Unternehmensart"><SelectValue /></SelectTrigger>
              <SelectContent>{site.presets.map((p) => <SelectItem key={p.key} value={p.key}>{p.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="mt-4" variant="destructive" disabled={!!busy} onClick={() => setConfirm({
            title: "Alles löschen?", danger: true,
            text: "Aktuelle Einträge, Leistungen und Einstellungen werden gelöscht und lassen sich nicht wiederherstellen (außer aus einer Inhaltsdatei). Anfragen und Benutzer bleiben.",
            action: () => run("reset", () => apiSend("/api/v1/admin/site/reset", "POST", { mode: resetMode, preset }), resetMode === "demo" ? "Website mit Beispielinhalt erstellt." : "Website geleert – folgen Sie dem Assistenten."),
          })}>Von null beginnen</Button>
        </section>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className={confirm?.danger ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} onClick={() => { const a = confirm?.action; setConfirm(null); void a?.(); }}>Bestätigen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

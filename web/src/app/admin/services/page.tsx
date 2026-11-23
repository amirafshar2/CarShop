"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminHeader, LoadState, StatusPill } from "@/components/app/admin-page";
import { apiSend, isAdmin, type ServiceItem, type ServicePriceType } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import { toman } from "@/lib/format";
import { priceTypeLabels, servicePrice } from "@/lib/services";
import { ImageField } from "@/components/admin/fields";

type Form = {
  title: string; category: string; description: string; features: string; priceType: ServicePriceType;
  priceToman: string; originalToman: string; unit: string; badge: string; imageUrl: string; sortOrder: string;
  isActive: boolean; isFeatured: boolean; version?: string;
};

const empty: Form = {
  title: "", category: "", description: "", features: "", priceType: "Fixed", priceToman: "", originalToman: "",
  unit: "", badge: "", imageUrl: "", sortOrder: "0", isActive: true, isFeatured: false,
};

const digits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^\d]/g, "");
const toRial = (toman: string) => (digits(toman) ? Number(digits(toman)) * 100 : null);
const toToman = (rial: number | null) => (rial ? String(rial / 100) : "");

const toForm = (s: ServiceItem): Form => ({
  title: s.title, category: s.category ?? "", description: s.description ?? "", features: s.features.join("\n"), priceType: s.priceType,
  priceToman: toToman(s.priceRial), originalToman: toToman(s.originalPriceRial), unit: s.unit ?? "", badge: s.badge ?? "",
  imageUrl: s.imageUrl ?? "", sortOrder: String(s.sortOrder), isActive: s.isActive, isFeatured: s.isFeatured, version: s.version,
});

const toPayload = (f: Form) => ({
  title: f.title, category: f.category || null, description: f.description || null,
  features: f.features.split("\n").map((x) => x.trim()).filter(Boolean), priceType: f.priceType,
  priceRial: f.priceType === "OnCall" ? null : toRial(f.priceToman),
  originalPriceRial: f.priceType === "OnCall" ? null : toRial(f.originalToman),
  unit: f.unit || null, badge: f.badge || null, imageUrl: f.imageUrl || null, sortOrder: Number(digits(f.sortOrder) || 0),
  isActive: f.isActive, isFeatured: f.isFeatured, version: f.version ?? null,
});

export default function AdminServicesPage() {
  const { user } = useSession();
  const canEdit = isAdmin(user);
  const { data, error, loading, reload } = useApi<ServiceItem[]>("/api/v1/admin/services");
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [deleting, setDeleting] = useState<ServiceItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setFormError(null);
    try {
      if (editing.id) await apiSend(`/api/v1/admin/services/${editing.id}`, "PUT", toPayload(editing.form));
      else await apiSend(`/api/v1/admin/services`, "POST", toPayload(editing.form));
      toast.success(editing.id ? "Leistung bearbeitet und auf der Website aktualisiert." : "Neue Leistung hinzugefügt.");
      setEditing(null);
      await reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (s: ServiceItem, isActive: boolean) => {
    try {
      await apiSend(`/api/v1/admin/services/${s.id}`, "PUT", { ...toPayload(toForm(s)), isActive });
      toast.success(isActive ? "Wird auf der Website angezeigt." : "Auf der Website versteckt.");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
      await reload();
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await apiSend(`/api/v1/admin/services/${deleting.id}`, "DELETE");
      toast.success("Leistung gelöscht.");
      setDeleting(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const f = editing?.form;

  return (
    <>
      <AdminHeader
        title="Leistungen und Preise"
        description="Jede Änderung hier erscheint sofort auf der Seite „Leistungen und Preise“."
        actions={
          <>
            <Button asChild variant="outline"><a href="/services" target="_blank" rel="noopener noreferrer">Auf der Website ansehen</a></Button>
            {canEdit && <Button onClick={() => { setFormError(null); setEditing({ id: null, form: empty }); }}><Plus className="me-1.5 size-4" />Leistung hinzufügen</Button>}
          </>
        }
      />

      {!canEdit && <p className="mb-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Ihre Rolle ist „Mitarbeiter“; nur der Admin kann Preise ändern.</p>}
      
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leistung</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Preis</TableHead>
                <TableHead>Auf der Website anzeigen</TableHead>
                {canEdit && <TableHead className="text-end">Aktionen</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-semibold">{s.title}</div>
                    <div className="mt-1 flex gap-1.5">
                      {s.badge && <StatusPill className="border-primary/40 bg-primary/10 text-primary">{s.badge}</StatusPill>}
                      {s.isFeatured && <StatusPill className="border-violet-500/40 bg-violet-500/10 text-violet-300">Highlight</StatusPill>}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{s.category ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-bold">{servicePrice(s)}</div>
                    {s.originalPriceRial && <div className="text-xs text-muted-foreground line-through">{toman(s.originalPriceRial)}</div>}
                  </TableCell>
                  <TableCell>
                    <Switch checked={s.isActive} disabled={!canEdit} onCheckedChange={(v) => void toggleActive(s, v)} aria-label={`Anzeigen: ${s.title} auf der Website`} />
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setFormError(null); setEditing({ id: s.id, form: toForm(s) }); }}>
                          <Pencil className="me-1.5 size-4" />Bearbeiten
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(s)} aria-label={`Löschen: ${s.title}`}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Noch keine Leistungen angelegt.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Leistung bearbeiten" : "Neue Leistung"}</DialogTitle>
            <DialogDescription>Preise werden in Euro eingegeben.</DialogDescription>
          </DialogHeader>
          {f && (
            <form id="service-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="s-title">Titel der Leistung</Label>
                <Input id="s-title" value={f.title} onChange={(e) => set("title", e.target.value)} required maxLength={120} placeholder="Titel der Leistung" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="s-cat">Kategorie (optional)</Label>
                <Input id="s-cat" list="service-cats" value={f.category} onChange={(e) => set("category", e.target.value)} maxLength={60} placeholder="z. B. Sonderleistungen" />
                <datalist id="service-cats">{[...new Set((data ?? []).map((x) => x.category).filter(Boolean))].map((c) => <option key={c!} value={c!} />)}</datalist>
              </div>
              <div className="grid gap-2">
                <Label>Preisart</Label>
                <Select value={f.priceType} onValueChange={(v) => set("priceType", v as ServicePriceType)}>
                  <SelectTrigger aria-label="Preisart"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(priceTypeLabels) as ServicePriceType[]).map((p) => <SelectItem key={p} value={p}>{priceTypeLabels[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {f.priceType !== "OnCall" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="s-price">Preis (€)</Label>
                    <Input id="s-price" dir="ltr" inputMode="numeric" value={f.priceToman} onChange={(e) => set("priceToman", e.target.value)} required placeholder="2500000" />
                    {toRial(f.priceToman) && <p className="text-xs text-muted-foreground">= {toman(toRial(f.priceToman))}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="s-orig">Preis vor Rabatt (optional)</Label>
                    <Input id="s-orig" dir="ltr" inputMode="numeric" value={f.originalToman} onChange={(e) => set("originalToman", e.target.value)} placeholder="—" />
                  </div>
                </>
              )}
              <div className="grid gap-2">
                <Label htmlFor="s-unit">Einheit</Label>
                <Input id="s-unit" value={f.unit} onChange={(e) => set("unit", e.target.value)} maxLength={40} placeholder="pro Person / pro Sitzung / ..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="s-badge">Etikett (optional)</Label>
                <Input id="s-badge" value={f.badge} onChange={(e) => set("badge", e.target.value)} maxLength={30} placeholder="Bestseller / Sonderangebot" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="s-desc">Beschreibung</Label>
                <Textarea id="s-desc" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="s-feat">Merkmale (eins pro Zeile)</Label>
                <Textarea id="s-feat" rows={4} value={f.features} onChange={(e) => set("features", e.target.value)} placeholder={"Schriftliche Garantie\nÜbergabe am selben Tag"} />
              </div>
              <ImageField className="sm:col-span-2" label="Bild (optional)" value={f.imageUrl} onChange={(v) => set("imageUrl", v ?? "")} />
              <div className="grid gap-2">
                <Label htmlFor="s-order">Reihenfolge</Label>
                <Input id="s-order" dir="ltr" inputMode="numeric" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
              </div>
              <div className="flex flex-col justify-end gap-3">
                <label className="flex items-center justify-between gap-3 text-sm font-medium">Auf der Website anzeigen <Switch checked={f.isActive} onCheckedChange={(v) => set("isActive", v)} /></label>
                <label className="flex items-center justify-between gap-3 text-sm font-medium">Besonderes Angebot (hervorgehoben) <Switch checked={f.isFeatured} onCheckedChange={(v) => set("isFeatured", v)} /></label>
              </div>
              {formError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{formError}</p>}
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button type="submit" form="service-form" disabled={busy}>{busy ? "Wird gespeichert…" : "Speichern"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>„{deleting?.title}“ löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Leistung wird von der Website und aus der Liste gelöscht. Soll sie nur vorübergehend nicht erscheinen, schalten Sie statt zu löschen „Auf der Website anzeigen“ aus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

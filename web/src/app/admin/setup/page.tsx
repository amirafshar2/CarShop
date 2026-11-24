"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ShoppingBag, Car, CheckCircle2, ExternalLink, Lightbulb, Loader2, Plane, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandSection, ContactSection, HeroSection, LookSection } from "@/components/admin/site-sections";
import { ImageField, SwitchRow, TextField, AreaField } from "@/components/admin/fields";
import { apiSend } from "@/lib/api";
import { patch, useAdminSite } from "@/lib/admin-site";
import { setupSteps, type StepKey } from "@/lib/setup-steps";
import type { SiteContent } from "@/lib/site";
import { fa, toman } from "@/lib/format";

const presetIcons: Record<string, React.ReactNode> = { car: <Car />, plane: <Plane />, bag: <ShoppingBag />, sparkles: <Sparkles /> };
const tips: Partial<Record<StepKey, string>> = {
  brand: "Kein Logo? Kein Problem – dann erscheinen die Anfangsbuchstaben Ihres Namens in der Farbe der Website. Ein Logo können Sie später ergänzen.",
  look: "Wählen Sie eine Farbe aus Ihrem Logo oder Ihrem Ladenschild. „Dunkel“ wirkt bei Autos und Luxus besser, „Hell“ bei Shops und Reisen.",
  contact: "Geben Sie die WhatsApp-Nummer mit Ländervorwahl ein (z. B. 4915123456789), damit der WhatsApp-Button funktioniert.",
  home: "Schreiben Sie die Überschrift kurz und klar: was Sie tun und für wen. Ein Satz genügt.",
  items: "Ein Eintrag reicht erst einmal, um zu sehen, wie die Website aussieht; den Rest fügen Sie später über das Menü hinzu.",
  services: "Wenn Sie keine Leistungen mit Preisen haben, überspringen Sie diesen Schritt; die Leistungsseite lässt sich auch in den Einstellungen ausschalten.",
  publish: "Öffnen Sie vor der Veröffentlichung die „Website-Vorschau“ und schauen Sie auch auf dem Handy nach.",
};

function Wizard() {
  const { site, reload, save, step } = useAdminSite();
  const router = useRouter();
  const params = useSearchParams();
  const steps = useMemo(() => setupSteps(site), [site]);
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [preset, setPreset] = useState<string>("");
  const [withDemo, setWithDemo] = useState(false);
  const [quick, setQuick] = useState({ title: "", price: "", priceType: "Fixed", category: "", image: null as string | null, summary: "" });
  const [svc, setSvc] = useState({ title: "", price: "", description: "" });

  useEffect(() => { if (site) { setDraft(site.content); setPreset((p) => p || site.preset); } }, [site]);

  if (!site || !draft) return <Skeleton className="h-96 w-full rounded-2xl" />;

  const requested = params.get("step") as StepKey | null;
  const index = Math.max(0, steps.findIndex((s) => s.key === (requested ?? steps.find((x) => !x.done(site))?.key ?? "type")));
  const current = steps[index];
  const go = (i: number) => router.push(`/admin/setup?step=${steps[Math.min(steps.length - 1, Math.max(0, i))].key}`);
  const set = (path: string, v: unknown) => setDraft((d) => (d ? patch(d, path, v) : d));
  const L = draft.labels;

  const run = async (fn: () => Promise<void>, next = true) => {
    setBusy(true);
    try {
      await fn();
      await reload();
      if (next) go(index + 1);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveStep = () => run(async () => {
    if (JSON.stringify(draft) !== JSON.stringify(site.content)) await save(draft);
    await step(current.key);
  });

  const applyPreset = () => run(async () => {
    await apiSend("/api/v1/admin/site/preset", "POST", { preset, withDemoData: withDemo });
    toast.success(withDemo ? "Unternehmensart und Beispielinhalt übernommen." : "Unternehmensart übernommen.");
  });

  const digits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
  const addItem = () => run(async () => {
    const price = digits(quick.price) ? Number(digits(quick.price)) * 100 : null;
    await apiSend("/api/v1/admin/listings", "POST", {
      title: quick.title, category: quick.category || null, summary: quick.summary || null, description: null,
      priceType: price ? quick.priceType : "OnCall", priceRial: price, originalPriceRial: null, unit: null, badge: null,
      images: quick.image ? [quick.image] : [], attributes: {}, status: "Published", isFeatured: true, sortOrder: 0,
    });
    await step("items");
    toast.success(`${L.itemSingular} hinzugefügt.`);
    setQuick({ title: "", price: "", priceType: "Fixed", category: "", image: null, summary: "" });
  });

  const addService = () => run(async () => {
    const price = digits(svc.price) ? Number(digits(svc.price)) * 100 : null;
    await apiSend("/api/v1/admin/services", "POST", {
      title: svc.title, category: null, description: svc.description || null, features: [], priceType: price ? "Fixed" : "OnCall",
      priceRial: price, originalPriceRial: null, unit: null, badge: null, imageUrl: null, sortOrder: 0, isActive: true, isFeatured: false,
    });
    await step("services");
    toast.success("Leistung hinzugefügt.");
    setSvc({ title: "", price: "", description: "" });
  });

  const publish = () => run(async () => {
    await save(draft).catch(() => undefined);
    await apiSend("/api/v1/admin/site/publish", "POST", { published: true });
    await apiSend("/api/v1/admin/site/setup/finish", "POST");
    toast.success("Die Website ist veröffentlicht!");
    router.push("/admin");
  }, false);

  const finishLater = () => run(async () => {
    if (JSON.stringify(draft) !== JSON.stringify(site.content)) await save(draft);
    await apiSend("/api/v1/admin/site/setup/finish", "POST");
    router.push("/admin");
  }, false);

  const doneCount = steps.filter((s) => s.done(site)).length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Einrichtungsassistent</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Schritt für Schritt zur eigenen Website</h1>
        </div>
        <Button asChild variant="outline"><a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />Website-Vorschau</a></Button>
      </div>

      {/* Stepper: scrolls sideways on phones */}
      <nav aria-label="Schritte" className="-mx-4 mb-6 overflow-x-auto px-4 pb-2">
        <ol className="flex min-w-max gap-2">
          {steps.map((s, i) => {
            const ok = s.done(site);
            return (
              <li key={s.key}>
                <button type="button" onClick={() => go(i)} aria-current={i === index ? "step" : undefined}
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${i === index ? "border-primary bg-primary text-primary-foreground" : ok ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-300" : "border-border text-muted-foreground"}`}>
                  {ok && i !== index ? <CheckCircle2 className="size-4" aria-hidden /> : <span className="grid size-5 place-items-center rounded-full bg-background/20 text-xs">{fa(i + 1)}</span>}
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`${fa(doneCount)} von ${fa(steps.length)} Schritt`}>
        <div className="h-full bg-primary transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-8" aria-labelledby="step-title">
        <p className="text-sm text-muted-foreground">{`Schritt ${fa(index + 1)} von ${fa(steps.length)}`}{current.optional ? " · optional" : ""}</p>
        <h2 id="step-title" className="mt-1 text-2xl font-black">{current.title}</h2>
        <p className="mt-2 text-muted-foreground">{current.why}</p>
        {tips[current.key] && (
          <p className="mt-4 flex gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm"><Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{tips[current.key]}</p>
        )}

        <div className="mt-8">
          {current.key === "type" && (
            <div className="grid grid-cols-1 gap-5">
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Unternehmensart">
                {site.presets.map((p) => (
                  <button key={p.key} type="button" role="radio" aria-checked={preset === p.key} onClick={() => setPreset(p.key)}
                    className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-start transition-colors ${preset === p.key ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary [&_svg]:size-5">{presetIcons[p.icon] ?? <Sparkles />}</span>
                    <span><span className="block font-bold">{p.title}</span><span className="mt-1 block text-sm text-muted-foreground">{p.description}</span></span>
                  </button>
                ))}
              </div>
              <SwitchRow label="Mit Beispielinhalt füllen" hint="Es werden einige Beispieleinträge und -leistungen mit Bildern angelegt, damit Sie das Aussehen sehen; später bearbeiten oder löschen. Name und Kontakt werden ebenfalls Beispiele."
                checked={withDemo} onChange={setWithDemo} />
            </div>
          )}
          {current.key === "brand" && <BrandSection c={draft} set={set} />}
          {current.key === "look" && <LookSection c={draft} set={set} />}
          {current.key === "contact" && <ContactSection c={draft} set={set} />}
          {current.key === "home" && (
            <div className="grid grid-cols-1 gap-6">
              <HeroSection c={draft} set={set} />
              <AreaField label="Ein Absatz „Über uns“ (optional)" value={draft.home.aboutText} onChange={(v) => set("home.aboutText", v)} max={3000} rows={4} />
              <p className="text-sm text-muted-foreground">Weitere Bereiche der Startseite (Vorteile, Fragen, Kennzahlen) stellen Sie später unter „Website-Einstellungen → Startseite“ ein.</p>
            </div>
          )}
          {current.key === "items" && (
            <div className="grid grid-cols-1 gap-5">
              {site.progress.listings > 0 && (
                <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{`${fa(site.progress.listings)} ${site.progress.listings === 1 ? L.itemSingular : L.itemPlural} angelegt. `}<Link href="/admin/items" className="font-semibold underline">Alle verwalten</Link></p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField className="sm:col-span-2" label={`Titel: ${L.itemSingular}`} required value={quick.title} onChange={(v) => setQuick({ ...quick, title: v })} max={150} />
                <div className="grid grid-cols-1 gap-2">
                  <span className="text-sm font-medium">Preis</span>
                  <div className="flex gap-2">
                    <Select value={quick.priceType} onValueChange={(v) => setQuick({ ...quick, priceType: v })}>
                      <SelectTrigger className="h-11 w-32" aria-label="Preisart"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Fixed">Festpreis</SelectItem><SelectItem value="From">von</SelectItem></SelectContent>
                    </Select>
                    <input dir="ltr" inputMode="numeric" value={quick.price} onChange={(e) => setQuick({ ...quick, price: e.target.value })} placeholder="€" aria-label="Preis in Euro" className="h-11 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3" />
                  </div>
                  <p className="text-xs text-muted-foreground">{digits(quick.price) ? `= ${toman(Number(digits(quick.price)) * 100)}` : "leer lassen = „Auf Anfrage“"}</p>
                </div>
                {draft.categories.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    <span className="text-sm font-medium">{L.categoryLabel}</span>
                    <Select value={quick.category} onValueChange={(v) => setQuick({ ...quick, category: v })}>
                      <SelectTrigger className="h-11" aria-label={L.categoryLabel}><SelectValue placeholder="Auswählen" /></SelectTrigger>
                      <SelectContent>{draft.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <TextField className="sm:col-span-2" label="Kurzbeschreibung" value={quick.summary} onChange={(v) => setQuick({ ...quick, summary: v })} max={200} />
                <ImageField className="sm:col-span-2" label="Bild" value={quick.image} onChange={(v) => setQuick({ ...quick, image: v })} />
              </div>
              <Button type="button" onClick={() => void addItem()} disabled={busy || !quick.title.trim()} className="justify-self-start">{busy && <Loader2 className="size-4 animate-spin" />}{`Hinzufügen: ${L.itemSingular}`}</Button>
            </div>
          )}
          {current.key === "services" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {site.progress.services > 0 && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 sm:col-span-2 dark:text-emerald-300">{`${fa(site.progress.services)} Leistung angelegt. `}<Link href="/admin/services" className="font-semibold underline">Leistungen verwalten</Link></p>}
              <TextField label="Titel der Leistung" value={svc.title} onChange={(v) => setSvc({ ...svc, title: v })} max={120} />
              <TextField label="Preis (€)" dir="ltr" value={svc.price} onChange={(v) => setSvc({ ...svc, price: v })} hint="leer = „Auf Anfrage“" />
              <AreaField className="sm:col-span-2" label="Beschreibung" value={svc.description} onChange={(v) => setSvc({ ...svc, description: v })} max={1000} rows={2} />
              <Button type="button" onClick={() => void addService()} disabled={busy || !svc.title.trim()} className="justify-self-start">Leistung hinzufügen</Button>
            </div>
          )}
          {current.key === "publish" && (
            <div className="grid grid-cols-1 gap-4">
              <ul className="grid grid-cols-1 gap-2">
                {steps.filter((s) => s.key !== "publish").map((s) => (
                  <li key={s.key} className="flex items-center gap-2 text-sm">
                    {s.done(site) ? <CheckCircle2 className="size-4 text-emerald-500" aria-hidden /> : <span className="size-4 rounded-full border border-border" aria-hidden />}
                    <button type="button" onClick={() => go(steps.indexOf(s))} className={s.done(site) ? "text-muted-foreground" : "font-semibold underline-offset-4 hover:underline"}>{s.title}</button>
                    {!s.done(site) && <span className="text-xs text-muted-foreground">{s.optional ? "(optional)" : "(nicht erledigt)"}</span>}
                  </li>
                ))}
              </ul>
              {site.isPublished
                ? <p className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">Die Website ist veröffentlicht und für alle sichtbar.</p>
                : <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Mit der Veröffentlichung verschwindet die Seite „Bald für Sie da“ und alle sehen die Website. Unter „Veröffentlichung und Backup“ können Sie sie jederzeit wieder verbergen.</p>}
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <Button type="button" variant="ghost" onClick={() => go(index - 1)} disabled={index === 0 || busy}><ArrowLeft className="size-4" />Zurück</Button>
          <div className="flex flex-wrap gap-2">
            {current.key !== "publish" && current.key !== "type" && (current.optional || current.key === "items") && (
              <Button type="button" variant="outline" disabled={busy} onClick={() => void run(async () => { await step(current.key); })}>Überspringen</Button>
            )}
            {current.key === "type" && (
              <Button type="button" onClick={() => void applyPreset()} disabled={busy || !preset}>{busy && <Loader2 className="size-4 animate-spin" />}Bestätigen und weiter<ArrowLeft className="size-4" /></Button>
            )}
            {["brand", "look", "contact", "home"].includes(current.key) && (
              <Button type="button" onClick={() => void saveStep()} disabled={busy || (current.key === "brand" && !draft.brand.name.trim())}>{busy && <Loader2 className="size-4 animate-spin" />}Speichern und weiter<ArrowLeft className="size-4" /></Button>
            )}
            {(current.key === "items" || current.key === "services") && current.done(site) && (
              <Button type="button" onClick={() => go(index + 1)} disabled={busy}>Weiter<ArrowRight className="size-4" /></Button>
            )}
            {current.key === "publish" && (
              <>
                <Button type="button" variant="outline" onClick={() => void finishLater()} disabled={busy}>Später veröffentlichen</Button>
                <Button type="button" onClick={() => void publish()} disabled={busy || !draft.brand.name.trim()}><Rocket className="size-4" />{site.isPublished ? "Einrichtung abschließen" : "Website veröffentlichen"}</Button>
              </>
            )}
          </div>
        </div>
      </section>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <button type="button" onClick={() => void finishLater()} className="underline-offset-4 hover:underline">Assistent schließen – später weitermachen</button>
        {" · "}Über den Button „Hilfe“ unten auf der Seite kommen Sie jederzeit zurück.
      </p>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense>
      <Wizard />
    </Suspense>
  );
}

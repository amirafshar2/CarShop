"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { getUploadStatus, mediaUrl, uploadFile, uploadId, uploadMedia } from "@/lib/api";

export function TextField({ label, value, onChange, hint, placeholder, max, dir, type = "text", required, className }: {
  label: string; value: string | null | undefined; onChange: (v: string) => void; hint?: string; placeholder?: string; max?: number;
  dir?: "ltr" | "rtl"; type?: string; required?: boolean; className?: string;
}) {
  const id = useId();
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={id} type={type} dir={dir} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={max} required={required} className="h-11" />
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AreaField({ label, value, onChange, hint, placeholder, max, rows = 4, className }: {
  label: string; value: string | null | undefined; onChange: (v: string) => void; hint?: string; placeholder?: string; max?: number; rows?: number; className?: string;
}) {
  const id = useId();
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={max} />
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Upload button + preview + «or paste a link». Video allowed with accept="video". */
export function ImageField({ label, value, onChange, hint, accept = "image", className }: {
  label: string; value: string | null | undefined; onChange: (v: string | null) => void; hint?: string; accept?: "image" | "video"; className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadFile(file));
      toast.success("آپلود شد.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
          {value ? (
            accept === "video" ? <video src={mediaUrl(value)} className="h-full w-full object-cover" muted /> :
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(value)} alt="" className="h-full w-full object-cover" />
          ) : <ImagePlus className="size-7 text-muted-foreground" aria-hidden />}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept={accept === "video" ? "video/mp4" : "image/jpeg,image/png,image/webp,image/gif"} className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} aria-label={`آپلود ${label}`} />
          <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{value ? "عوض کردن" : "آپلود"}
          </Button>
          {value && <Button type="button" variant="ghost" onClick={() => onChange(null)}><X className="size-4" />حذف</Button>}
          <Button type="button" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setShowUrl((v) => !v)}>لینک</Button>
        </div>
      </div>
      {showUrl && <Input dir="ltr" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} placeholder="https://…" className="h-10" aria-label={`لینک ${label}`} />}
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Several images: upload many at once, reorder, remove. The first one is the cover. */
export function ImagesField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    for (const f of Array.from(files).slice(0, 12 - value.length)) {
      try { added.push(await uploadFile(f)); } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
    }
    onChange([...value, ...added]);
    setBusy(false);
    if (input.current) input.current.value = "";
  };
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">تصاویر <span className="text-xs text-muted-foreground">(اولی عکس اصلی است)</span></span>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => void pick(e.target.files)} aria-label="آپلود تصاویر" />
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy || value.length >= 12}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}افزودن عکس
        </Button>
      </div>
      {value.length === 0 ? (
        <button type="button" onClick={() => input.current?.click()} className="grid h-32 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-accent">
          برای آپلود عکس اینجا بزنید
        </button>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((src, i) => (
            <li key={src + i} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(src)} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute start-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">اصلی</span>}
              <div className="absolute inset-x-1 bottom-1 flex justify-center gap-1">
                {i > 0 && <button type="button" onClick={() => move(i, -1)} aria-label="جلوتر" className="grid size-7 place-items-center rounded-md bg-background/90"><ArrowUp className="size-3.5" /></button>}
                {i < value.length - 1 && <button type="button" onClick={() => move(i, 1)} aria-label="عقب‌تر" className="grid size-7 place-items-center rounded-md bg-background/90"><ArrowDown className="size-3.5" /></button>}
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="حذف عکس" className="grid size-7 place-items-center rounded-md bg-background/90 text-destructive"><Trash2 className="size-3.5" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const SWATCHES = ["#f97316", "#ef4444", "#e11d48", "#a855f7", "#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#78716c"];

export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-3">
      <span className="text-sm font-medium">رنگ اصلی سایت</span>
      <div className="flex flex-wrap items-center gap-2">
        {SWATCHES.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} aria-label={`رنگ ${c}`} aria-pressed={value.toLowerCase() === c}
            className={`size-10 rounded-full border-2 transition-transform ${value.toLowerCase() === c ? "scale-110 border-foreground" : "border-transparent"}`} style={{ background: c }} />
        ))}
        <label className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label="رنگ دلخواه" />
          <span dir="ltr">{value}</span>
        </label>
      </div>
    </div>
  );
}

/** Generic editable list (highlights, FAQ, menu, …) with add / remove / reorder. */
export function ListEditor<T>({ items, onChange, make, render, addLabel, max = 20, empty }: {
  items: T[]; onChange: (items: T[]) => void; make: () => T; render: (item: T, set: (v: T) => void, index: number) => React.ReactNode;
  addLabel: string; max?: number; empty?: string;
}) {
  const move = (i: number, d: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="grid gap-3">
      {items.length === 0 && empty && <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{empty}</p>}
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-3">
          <div className="grid gap-3">{render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}</div>
          <div className="mt-2 flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="بالاتر"><ArrowUp className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="پایین‌تر"><ArrowDown className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="حذف"><Trash2 className="size-4" /></Button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" onClick={() => onChange([...items, make()])} className="justify-self-start"><Plus className="size-4" />{addLabel}</Button>
      )}
    </div>
  );
}

/**
 * Hero video: upload → the server makes the fast scroll versions + a poster in the background
 * (a short keyframe interval so slow computers can scrub smoothly). Polls until they exist.
 */
export function HeroVideoField({ value, optimized, mode, onChange }: {
  value: string | null | undefined; optimized: boolean; mode: "scroll" | "loop";
  onChange: (patch: { url?: string | null; optimized?: boolean; mode?: "scroll" | "loop"; poster?: string | null }) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const id = uploadId(value);
  const waiting = !!id && !optimized && !failed;

  useEffect(() => {
    if (!id || optimized) return;
    let stop = false;
    const check = async () => {
      try {
        const s = await getUploadStatus(id);
        if (stop) return;
        if (s.ready) { onChange({ optimized: true, poster: s.poster }); toast.success("ویدیو برای پخش روان آماده شد."); return; }
        if (s.failed) { setFailed(s.failed); toast.error(s.failed); return; }
      } catch { /* try again */ }
      if (!stop) timer = setTimeout(check, 4000);
    };
    let timer = setTimeout(check, 1500);
    return () => { stop = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, optimized]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await uploadMedia(file);
      setFailed(null);
      onChange({ url: r.url, optimized: false });
      toast.success(r.optimizing ? "آپلود شد؛ نسخه‌ی سبک و روان در حال ساخت است…" : "آپلود شد.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="grid gap-3 sm:col-span-2">
      <span className="text-sm font-medium">ویدیوی صفحه‌ی اول (اختیاری)</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-24 w-40 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
          {value ? <video src={mediaUrl(value)} className="h-full w-full object-cover" muted /> : <ImagePlus className="size-7 text-muted-foreground" aria-hidden />}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="video/mp4,video/quicktime" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} aria-label="آپلود ویدیو" />
          <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{value ? "عوض کردن" : "آپلود ویدیو"}
          </Button>
          {value && <Button type="button" variant="ghost" onClick={() => onChange({ url: null, optimized: false })}><X className="size-4" />حذف</Button>}
          <Button type="button" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setShowUrl((v) => !v)}>لینک</Button>
        </div>
      </div>
      {showUrl && <Input dir="ltr" value={value ?? ""} onChange={(e) => onChange({ url: e.target.value || null, optimized: false })} placeholder="https://….mp4" className="h-10" aria-label="لینک ویدیو" />}
      {value && (
        <p role="status" className={`flex items-center gap-2 text-xs ${waiting ? "text-primary" : "text-muted-foreground"}`}>
          {waiting && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {waiting
            ? "در حال بهینه‌سازی برای کامپیوترهای ضعیف… (چند دقیقه؛ می‌توانید ذخیره کنید و بروید)"
            : failed ? failed
            : optimized ? "بهینه شده: نسخه‌ی ۱۰۸۰ و ۷۲۰ مخصوص اسکرول + عکس اول ساخته شد." : "لینک بیرونی بهینه نمی‌شود؛ برای بهترین نتیجه ویدیو را آپلود کنید."}
        </p>
      )}
      <div className="grid gap-2 sm:max-w-sm">
        <span className="text-sm font-medium">نحوه‌ی پخش</span>
        <div className="grid grid-cols-2 gap-2">
          {([["scroll", "با اسکرول جلو/عقب می‌رود"], ["loop", "خودکار و تکراری"]] as const).map(([k, t]) => (
            <Button key={k} type="button" variant={mode === k ? "default" : "outline"} onClick={() => onChange({ mode: k })} className="h-auto whitespace-normal py-2 text-xs">{t}</Button>
          ))}
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">MP4 یا MOV، حداکثر ۸۰ مگابایت، ۵ تا ۱۵ ثانیه بهترین است. صدا حذف می‌شود. روی گوشی با «صرفه‌جویی داده» فقط عکس اول نشان داده می‌شود.</p>
    </div>
  );
}

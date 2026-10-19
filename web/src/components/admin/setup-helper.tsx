"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle, HelpCircle, X } from "lucide-react";
import { useAdminSite } from "@/lib/admin-site";
import { setupSteps } from "@/lib/setup-steps";
import { fa } from "@/lib/format";

/** Floating «راهنما» button on every admin page: what is done, what is next, one click to continue. */
export default function SetupHelper() {
  const { site } = useAdminSite();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  if (!site || path?.startsWith("/admin/setup")) return null;
  const steps = setupSteps(site);
  const done = steps.filter((s) => s.done(site)).length;
  const next = steps.find((s) => !s.done(site) && !s.optional);
  const all = done === steps.length;

  return (
    <div className="fixed bottom-4 end-4 z-40 flex flex-col items-end gap-3">
      {open && (
        <div role="dialog" aria-label="راهنمای راه‌اندازی" className="w-[min(92vw,360px)] rounded-2xl border border-border bg-card p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold">راهنمای راه‌اندازی</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="بستن" className="grid size-8 place-items-center rounded-md hover:bg-accent"><X className="size-4" /></button>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full bg-primary transition-all" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
          <p className="mb-3 text-xs text-muted-foreground">{`${fa(done)} از ${fa(steps.length)} مرحله انجام شده`}</p>
          <ol className="space-y-1">
            {steps.map((s) => {
              const ok = s.done(site);
              return (
                <li key={s.key}>
                  <Link href={`/admin/setup?step=${s.key}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent">
                    {ok ? <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-label="انجام شد" /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="انجام نشده" />}
                    <span className={ok ? "text-muted-foreground line-through" : "font-medium"}>{s.title}</span>
                    {s.optional && <span className="text-xs text-muted-foreground">(اختیاری)</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
          {next ? (
            <Link href={`/admin/setup?step=${next.key}`} onClick={() => setOpen(false)} className="mt-3 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground">
              {`ادامه: ${next.title}`}
            </Link>
          ) : (
            <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-center text-sm text-emerald-600 dark:text-emerald-300">همه‌چیز آماده است.</p>
          )}
        </div>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg">
        <HelpCircle className="size-5" aria-hidden />راهنما
        {!all && <span className="absolute -end-1 -top-1 grid size-6 place-items-center rounded-full bg-foreground text-[11px] text-background">{fa(steps.length - done)}</span>}
      </button>
    </div>
  );
}

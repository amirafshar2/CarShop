"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase, ShieldCheck, UserRound } from "lucide-react";
import { Field, OtpInput } from "@/components/ui/otp-input-verification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { demoLogin, getDemoInfo, getSetupStatus, isStaff, requestOtp, verifyOtp } from "@/lib/api";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { fa } from "@/lib/format";

/** Where to go after login: the requested page, otherwise the admin panel for staff and the account page for customers. */
function destination(roles: string[], next: string | null) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return isStaff({ id: "", phone: "", fullName: null, roles }) ? "/admin" : "/account";
}

/** «ورود نمایشی»: one click into the admin or staff panel for presentations. */
function DemoAccess({ onDone }: { onDone: (roles: string[]) => void }) {
  const [info, setInfo] = useState<{ enabled: boolean; requiresKey: boolean } | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"Admin" | "Staff" | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void getDemoInfo().then(setInfo);
  }, []);

  if (!info?.enabled) return null;

  const go = async (role: "Admin" | "Staff") => {
    setBusy(role);
    setError(undefined);
    try {
      const r = await demoLogin(role, key || undefined);
      toast.success(role === "Admin" ? "به پنل مدیریت خوش آمدید" : "به پنل کارمند خوش آمدید");
      onDone(r.user.roles);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const roles = [
    { role: "Admin" as const, icon: ShieldCheck, title: "مدیر", desc: "همه‌ی بخش‌ها: خودروها، خدمات، درخواست‌ها و کاربران", variant: "default" as const },
    { role: "Staff" as const, icon: Briefcase, title: "کارمند", desc: "مدیریت خودروها و پیگیری درخواست‌ها", variant: "outline" as const },
  ];
  const locked = !!busy || (info.requiresKey && !key);

  return (
    <section aria-labelledby="demo-title" className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm sm:p-4">
      <div>
        <p id="demo-title" className="font-bold text-foreground">ورود سریع نمایشی، با یک کلیک</p>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {info.requiresKey ? "رمز نمایشی را وارد کنید و نقش را انتخاب کنید. پیامک لازم نیست." : "نقش را انتخاب کنید. پیامک و کد لازم نیست."}
        </p>
      </div>
      {info.requiresKey && (
        <Input type="password" autoComplete="off" placeholder="رمز نمایشی" aria-label="رمز نمایشی" value={key} onChange={(e) => setKey(e.target.value)} />
      )}
      <div className="grid grid-cols-2 gap-2">
        {roles.map(({ role, icon: Icon, title, desc, variant }) => (
          <Button
            key={role}
            type="button"
            variant={variant}
            disabled={locked}
            onClick={() => void go(role)}
            className="h-auto min-h-11 flex-col items-center gap-1 whitespace-normal px-2 py-3 text-center"
          >
            <span className="flex items-center gap-1.5 text-sm font-bold">
              <Icon className="size-4 shrink-0" aria-hidden />
              {busy === role ? "در حال ورود…" : `ورود ${title}`}
            </span>
            <span className="text-[11px] font-normal leading-snug opacity-80 sm:text-xs">{desc}</span>
          </Button>
        ))}
      </div>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
        <UserRound className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          پنل مشتری: هر شماره‌ی موبایلی را وارد کنید، کد تأیید روی همین صفحه نمایش داده می‌شود.
        </span>
      </p>
    </section>
  );
}

function LoginForm() {
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  const { user, ready } = useSession();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  useEffect(() => { void getSetupStatus().then((s) => setFresh(!!s && !s.hasAdmin)); }, []);

  // Already signed in (refresh cookie) → straight to the right panel.
  useEffect(() => {
    if (ready && user) router.replace(destination(user.roles, nextParam));
  }, [ready, user, nextParam, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const r = await requestOtp(phone);
      setCooldown(r.resendAfterSeconds);
      setDevCode(r.devCode ?? null);
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setBusy(true);
    setError(undefined);
    try {
      const r = await verifyOtp(phone, value, name || undefined);
      toast.success(`خوش آمدید${r.user.fullName ? ` ${r.user.fullName}` : ""}`);
      router.push(destination(r.user.roles, nextParam));
    } catch (e) {
      setError((e as Error).message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">ورود / ثبت‌نام</CardTitle>
        <CardDescription>با شماره موبایل؛ بدون رمز عبور.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {fresh && (
          <Link href="/setup" className="block rounded-xl border border-primary/50 bg-primary/10 p-4 text-sm">
            <span className="block font-bold">این سایت هنوز مدیر ندارد</span>
            <span className="mt-1 block text-muted-foreground">برای راه‌اندازی و ساخت حساب مدیر اینجا بزنید ←</span>
          </Link>
        )}
        {step === "phone" ? (
          <>
          <DemoAccess onDone={(roles) => router.push(destination(roles, nextParam))} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
            <span className="h-px flex-1 bg-border" />یا با شماره موبایل<span className="h-px flex-1 bg-border" />
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Field label="شماره موبایل" error={error}>
              <Input dir="ltr" inputMode="tel" autoComplete="tel" placeholder="09xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
            <Field label="نام و نام خانوادگی" optional>
              <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button className="w-full" size="lg" disabled={busy}>
              {busy ? "در حال ارسال…" : "دریافت کد تأیید"}
            </Button>
            <p className="text-center text-sm text-muted-foreground"><Link href="/setup" className="hover:text-foreground hover:underline">ورود مدیر با کلید راه‌اندازی</Link></p>
          </form>
          </>
        ) : (
          <div className="space-y-4">
            {devCode && (
              <div role="status" className="flex flex-col gap-3 rounded-xl border border-primary/50 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">حالت آزمایشی (پیامک واقعی ارسال نمی‌شود) — کد ورود:</p>
                  <p dir="ltr" className="mt-1 text-end text-2xl font-black tracking-[0.3em] text-primary sm:text-start">{devCode}</p>
                </div>
                <Button type="button" size="sm" disabled={busy} onClick={() => { setCode(devCode); void verify(devCode); }}>
                  ورود با این کد
                </Button>
              </div>
            )}
            <Field label={`کد ۶ رقمی ارسال‌شده به ${phone}`} error={error} hint={busy ? "در حال بررسی…" : "کد بعد از وارد شدن رقم آخر خودکار بررسی می‌شود."}>
              <div dir="ltr">
                <OtpInput length={6} value={code} onChange={setCode} onComplete={verify} disabled={busy} autoFocus />
              </div>
            </Field>
            <div className="flex items-center justify-between text-sm">
              <Button variant="ghost" size="sm" onClick={() => setStep("phone")}>تغییر شماره</Button>
              <Button variant="ghost" size="sm" disabled={cooldown > 0 || busy} onClick={() => void send()}>
                {cooldown > 0 ? `ارسال مجدد تا ${fa(cooldown)} ثانیه` : "ارسال مجدد کد"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 pt-28">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

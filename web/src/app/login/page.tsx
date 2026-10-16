"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Field, OtpInput } from "@/components/ui/otp-input-verification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { demoLogin, getDemoInfo, isStaff, requestOtp, verifyOtp } from "@/lib/api";
import { useSession } from "@/lib/session";
import { fa } from "@/lib/format";

/** Where to go after login: the requested page, otherwise the admin panel for staff and the account page for customers. */
function destination(roles: string[], next: string | null) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return isStaff({ id: "", phone: "", fullName: null, roles }) ? "/admin" : "/account";
}

/** «ورود نمایشی»: one click into the admin or staff panel for presentations. */
function DemoAccess({ phone, onDone }: { phone: (p: string) => void; onDone: (roles: string[]) => void }) {
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

  return (
    <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
      <div>
        <p className="font-bold text-foreground">ورود سریع به پنل مدیریت (نسخه‌ی نمایشی)</p>
        <p className="mt-1 text-muted-foreground">
          {info.requiresKey ? "رمز نمایشی را وارد کنید و نقش را انتخاب کنید — بدون پیامک." : "روی یکی از دکمه‌ها بزنید — بدون پیامک."}
        </p>
      </div>
      {info.requiresKey && (
        <Input type="password" autoComplete="off" placeholder="رمز نمایشی" aria-label="رمز نمایشی" value={key} onChange={(e) => setKey(e.target.value)} />
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" disabled={!!busy || (info.requiresKey && !key)} onClick={() => void go("Admin")}>
          {busy === "Admin" ? "در حال ورود…" : "ورود به‌عنوان مدیر"}
        </Button>
        <Button type="button" variant="outline" disabled={!!busy || (info.requiresKey && !key)} onClick={() => void go("Staff")}>
          {busy === "Staff" ? "در حال ورود…" : "ورود به‌عنوان کارمند"}
        </Button>
      </div>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {!info.requiresKey && (
        <p className="text-xs text-muted-foreground">
          یا با شماره وارد شوید: مدیر{" "}
          <button type="button" className="text-primary hover:underline" dir="ltr" onClick={() => phone("09120000001")}>09120000001</button>
          {" "}· کارمند{" "}
          <button type="button" className="text-primary hover:underline" dir="ltr" onClick={() => phone("09120000002")}>09120000002</button>
        </p>
      )}
    </div>
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
        {step === "phone" ? (
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
            <DemoAccess phone={setPhone} onDone={(roles) => router.push(destination(roles, nextParam))} />
          </form>
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/admin/fields";
import { claimAdmin, getSetupStatus } from "@/lib/api";

/**
 * Fresh site: the owner opens /setup, enters their mobile and the setup key they received → becomes admin.
 * Later the same page signs an existing admin in with the key (useful before an SMS panel is connected).
 */
export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<{ hasAdmin: boolean; requiresKey: boolean } | null | undefined>(undefined);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => { void getSetupStatus().then(setStatus); }, []);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await claimAdmin(phone, name || undefined, key || undefined);
      toast.success(status?.hasAdmin ? "Willkommen" : "Admin-Konto angelegt. Jetzt geht es an die Website!");
      router.push(status?.hasAdmin ? "/admin" : "/admin/setup");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const first = status && !status.hasAdmin;
  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 pb-16 pt-28">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary"><KeyRound className="size-6" aria-hidden /></span>
          <CardTitle className="text-2xl">{first ? "Website einrichten" : "Admin-Anmeldung mit Schlüssel"}</CardTitle>
          <CardDescription>
            {status === undefined ? "Wird geprüft…" : status === null ? "Keine Verbindung zum Server." : first
              ? "Geben Sie Ihre Handynummer ein, um Admin dieser Website zu werden. Danach hilft Ihnen der Assistent Schritt für Schritt beim Aufbau der Website."
              : "Wenn SMS nicht aktiv ist, melden Sie sich mit der Admin-Nummer und dem Einrichtungsschlüssel an."}
          </CardDescription>
        </CardHeader>
        {status && (
          <CardContent>
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
              <TextField label="Handynummer" dir="ltr" required value={phone} onChange={setPhone} placeholder="0151 23456789" type="tel" />
              {first && <TextField label="Ihr Name (optional)" value={name} onChange={setName} max={80} />}
              {status.requiresKey && <TextField label="Einrichtungsschlüssel" dir="ltr" type="password" required value={key} onChange={setKey} hint="Den Schlüssel haben Sie zusammen mit der Website erhalten." />}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button size="lg" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{first ? "Admin-Konto anlegen" : "Anmelden"}</Button>
              <p className="text-center text-sm text-muted-foreground"><Link href="/login" className="hover:text-foreground hover:underline">Mit SMS-Code anmelden</Link></p>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

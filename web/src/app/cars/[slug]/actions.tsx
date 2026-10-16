"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAccessToken, refreshSession, reserveCar } from "@/lib/api";
import { toman } from "@/lib/format";

export default function CarActions({ carId, slug, reserved }: { carId: string; slug: string; reserved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const reserve = async () => {
    if (!getAccessToken() && !(await refreshSession())) {
      router.push(`/login?next=/cars/${slug}`);
      return;
    }
    setBusy(true);
    try {
      const r = await reserveCar(carId);
      toast.success(`رزرو شد — مبلغ بیعانه ${toman(r.depositRial)}. تا ۴۸ ساعت برای شما نگه داشته می‌شود.`, {
        action: { label: "رزروهای من", onClick: () => router.push("/account") },
      });
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky bottom-4 z-20 grid gap-3 rounded-2xl border border-border bg-background/85 p-4 backdrop-blur-xl sm:grid-cols-3">
      <Button size="lg" onClick={reserve} disabled={busy || reserved}>
        {reserved ? "رزرو شده" : busy ? "در حال رزرو…" : "رزرو با بیعانه"}
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href={`/contact?type=VisitRequest&car=${carId}`}>رزرو بازدید / درخواست قیمت</Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <a href="https://wa.me/989171006003" target="_blank" rel="noopener noreferrer">واتساپ</a>
      </Button>
    </div>
  );
}

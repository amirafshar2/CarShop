"use client";

import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { isStaff } from "@/lib/api";
import { Eye } from "lucide-react";

const OPEN = ["/admin", "/login", "/setup", "/account"];

/**
 * Unpublished site: visitors see a «coming soon» page, staff see the real site with a preview bar.
 * The panel, login and setup pages always work.
 */
export default function SiteGate({ published, brand, tagline, children }: { published: boolean; brand: string; tagline: string | null; children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const { user, ready } = useSession();
  if (published || OPEN.some((p) => path.startsWith(p))) return <>{children}</>;
  if (!ready) return <div className="min-h-screen" aria-busy />;
  if (isStaff(user))
    return (
      <>
        <div role="status" className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Eye className="size-4" aria-hidden /> پیش‌نمایش: سایت هنوز منتشر نشده و بازدیدکننده‌ها صفحه‌ی «به‌زودی» را می‌بینند.
          <a href="/admin/publish" className="underline underline-offset-4">انتشار</a>
        </div>
        {children}
      </>
    );
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-primary">به‌زودی</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">{brand || "سایت در حال آماده‌سازی"}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{tagline ?? "سایت ما به‌زودی راه‌اندازی می‌شود."}</p>
        <a href="/login" className="mt-10 inline-block text-xs text-muted-foreground underline underline-offset-4">ورود مدیر</a>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Car, ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, Sparkles, Users } from "lucide-react";
import { Sidebar, SidebarFooter, SidebarHeader, SidebarItem, SidebarNav, SidebarSection, SidebarToggle, useSidebar } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdmin, isStaff, logout, type SessionUser } from "@/lib/api";
import { useSession } from "@/lib/session";
import { roleLabels } from "@/lib/labels";

const NAV = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard, exact: true },
  { href: "/admin/cars", label: "خودروها", icon: Car },
  { href: "/admin/services", label: "خدمات و قیمت‌ها", icon: Sparkles },
  { href: "/admin/leads", label: "درخواست‌های مشتری", icon: Inbox },
  { href: "/admin/users", label: "کاربران و کارمندان", icon: Users, adminOnly: true },
];

function Brand() {
  const { collapsed } = useSidebar();
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">MM</span>
      {!collapsed && <span className="truncate text-[15px] font-bold">پنل مروجی موتورز</span>}
    </Link>
  );
}

function UserBox({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { collapsed } = useSidebar();
  const role = user.roles.find((r) => r !== "Customer") ?? "Customer";
  return (
    <div className="flex w-full items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold">{(user.fullName ?? "؟").slice(0, 1)}</span>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{user.fullName ?? "بدون نام"}</div>
          <div className="truncate text-xs text-muted-foreground">{roleLabels[role]} · <span dir="ltr">{user.phone}</span></div>
        </div>
      )}
      <button type="button" onClick={onLogout} aria-label="خروج" title="خروج" className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

function NavItems({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <>
      <SidebarSection label="مدیریت">
        {NAV.filter((n) => !n.adminOnly || isAdmin(user)).map((n) => (
          <SidebarItem
            key={n.href}
            href={n.href}
            icon={<n.icon className="size-[18px]" />}
            active={n.exact ? path === n.href : path?.startsWith(n.href)}
            onClick={onNavigate}
            className="py-2.5 text-[15px]"
          >
            {n.label}
          </SidebarItem>
        ))}
      </SidebarSection>
      <SidebarSection label="سایت">
        <SidebarItem href="/" icon={<ExternalLink className="size-[18px]" />} className="py-2.5 text-[15px]" onClick={onNavigate}>
          مشاهده‌ی سایت
        </SidebarItem>
      </SidebarSection>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(path ?? "/admin")}`);
  }, [ready, user, router, path]);

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-40 w-full max-w-md rounded-2xl" />
      </div>
    );
  }

  if (!isStaff(user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">به پنل مدیریت دسترسی ندارید</h1>
        <p className="text-muted-foreground">این حساب «مشتری» است. اگر کارمند هستید، از مدیر بخواهید نقش شما را «کارشناس» کند.</p>
        <div className="flex gap-3">
          <Button asChild><Link href="/account">رفتن به حساب من</Link></Button>
          <Button variant="outline" onClick={signOut}>خروج</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar variant="collapsible" aria-label="منوی پنل مدیریت" className="h-full bg-card">
          <SidebarHeader>
            <Brand />
            <SidebarToggle className="ms-auto" />
          </SidebarHeader>
          <SidebarNav>
            <NavItems user={user} />
          </SidebarNav>
          <SidebarFooter>
            <UserBox user={user} onLogout={signOut} />
          </SidebarFooter>
        </Sidebar>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">MM</span>
            پنل مدیریت
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="باز کردن منو"><Menu className="size-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-xs p-0">
              <SheetTitle className="sr-only">منوی پنل</SheetTitle>
              <Sidebar aria-label="منوی پنل مدیریت" className="h-full w-full border-0" width={320}>
                <SidebarHeader><Brand /></SidebarHeader>
                <SidebarNav><NavItems user={user} onNavigate={() => setMobileOpen(false)} /></SidebarNav>
                <SidebarFooter><UserBox user={user} onLogout={signOut} /></SidebarFooter>
              </Sidebar>
            </SheetContent>
          </Sheet>
        </header>
        <div className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </div>
    </div>
  );
}

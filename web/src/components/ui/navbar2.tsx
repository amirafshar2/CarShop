"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import { isStaff } from "@/lib/api";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { unsplash } from "@/lib/media";
import { ChevronDown, Menu, X } from "lucide-react";
import {
  FaInstagram, // Instagram
  FaWhatsapp, // WhatsApp
} from "react-icons/fa6";

type MegaColumn = {
  eyebrow: string;
  links: { label: string; href: string; active?: boolean; badge?: string }[];
};

type MegaMenu = {
  columns: MegaColumn[];
  footerLinks?: { label: string; href: string }[];
  showSocials?: boolean;
  image: { src: string; alt: string };
  imageCaption?: string;
};

const U = (id: string) => unsplash(id, 800);

const INVENTORY_MENU: MegaMenu = {
  columns: [
    {
      eyebrow: "موجودی",
      links: [
        { label: "همه‌ی خودروها", href: "/inventory", active: true },
        { label: "لیست موجودی امروز", href: "/inventory?sort=newest", badge: "امروز" },
        { label: "خودروهای صفر", href: "/inventory?condition=New" },
        { label: "کارکرده", href: "/inventory?condition=Used" },
      ],
    },
    {
      eyebrow: "ویژه",
      links: [
        { label: "گذر موقت", href: "/inventory?listingType=TemporaryPass" },
        { label: "فروش حواله", href: "/inventory?listingType=Hawaleh" },
      ],
    },
  ],
  footerLinks: [{ label: "قیمت‌ها به‌روز می‌شوند — برای «قیمت تماس» درخواست بدهید", href: "/contact" }],
  showSocials: true,
  image: { src: U("1590362891991-f776e747a588"), alt: "نمایشگاه مروجی موتورز" },
  imageCaption: "موجودی روز مروجی موتورز",
};

const SERVICES_MENU: MegaMenu = {
  columns: [
    {
      eyebrow: "خدمات ما",
      links: [
        { label: "همه‌ی خدمات و قیمت‌ها", href: "/services", active: true, badge: "قیمت" },
        { label: "خرید از راه دور", href: "/services#Purchase", badge: "بدون حضور" },
        { label: "ماشینت رو بفروش", href: "/contact?type=SellMyCar", badge: "بدون کمیسیون" },
        { label: "کارشناسی و تعویض پلاک", href: "/services#Paperwork" },
      ],
    },
    {
      eyebrow: "دیتیلینگ",
      links: [
        { label: "سرامیک بدنه", href: "/services#Detailing" },
        { label: "واکس و پولیش", href: "/services#Detailing" },
        { label: "صفرشویی و کاور بدنه", href: "/services#Detailing" },
      ],
    },
  ],
  footerLinks: [{ label: "پرداخت نقد و اقساط", href: "/contact" }],
  image: { src: U("1520340356584-f9917d1eea6f"), alt: "دیتیلینگ خودرو" },
  imageCaption: "صفر تا صد خدمات خودرو",
};

const COMPANY_MENU: MegaMenu = {
  columns: [
    {
      eyebrow: "مروجی موتورز",
      links: [
        { label: "همکاری‌های سازمانی", href: "/#organizations" },
        { label: "رضایت مشتری", href: "/#reviews" },
        { label: "دعوت به همکاری", href: "/contact?type=General", badge: "استخدام" },
      ],
    },
    {
      eyebrow: "ارتباط",
      links: [
        { label: "آدرس و تماس", href: "/contact" },
        { label: "۰۹۱۷۱۰۰۶۰۰۳", href: "tel:09171006003" },
      ],
    },
  ],
  footerLinks: [{ label: "شیراز، چهارراه زرگری، برج بارانا، طبقه اول", href: "/contact" }],
  image: { src: U("1563720223185-11003d516935"), alt: "خودرو در نمایشگاه" },
  imageCaption: "از انتخاب تا تعویض پلاک",
};

const MEGA_MENUS: Record<string, MegaMenu> = {
  "موجودی": INVENTORY_MENU,
  "خدمات": SERVICES_MENU,
  "مروجی موتورز": COMPANY_MENU,
};

const NAV_ITEMS = [
  { label: "موجودی", hasMenu: true },
  { label: "خدمات", hasMenu: true },
  { label: "مروجی موتورز", hasMenu: true },
  { label: "تماس", hasMenu: false, href: "/contact" },
] as const;

const SOCIALS = [
  { href: "https://www.instagram.com/moraveji.motors", label: "Instagram", icon: FaInstagram },
  { href: "https://www.instagram.com/moravejimotors_detailing", label: "Instagram Detailing", icon: FaInstagram },
  { href: "https://wa.me/989171006003", label: "WhatsApp", icon: FaWhatsapp },
];

export default function Navbar2() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { user } = useSession();
  // Signed-in users go to their panel instead of the login page.
  const account = !user
    ? { href: "/login", label: "ورود" }
    : isStaff(user)
      ? { href: "/admin", label: "پنل مدیریت" }
      : { href: "/account", label: "حساب من" };
  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  // Close menus on Escape or a click outside the header.
  useEffect(() => {
    if (!openMenu && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAll();
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) closeAll();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [openMenu, mobileOpen]);
  const toggleMenu = (label: string, hasMenu: boolean) => {
    if (!hasMenu) {
      setOpenMenu(null);
      return;
    }
    setOpenMenu((current) => (current === label ? null : label));
  };

  const activeMenu = openMenu ? MEGA_MENUS[openMenu] : null;

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-4">
      <div className="w-full max-w-7xl">
        <motion.div
          layout
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-3xl border border-border bg-background/95 backdrop-blur-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]"
        >
          {/* Top row */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8">
            {/* Logo */}
            <Link href="/" onClick={closeAll} className="flex shrink-0 items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                MM
              </span>
              <span className="text-[1.2rem] font-bold tracking-tight text-foreground">
                مروجی موتورز
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map((item) => {
                const isOpen = openMenu === item.label;
                if (!item.hasMenu) {
                  return (
                    <Link
                      onClick={closeAll}
                      key={item.label}
                      href={item.href ?? "#"}
                      className="rounded-full px-4 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.label}
                    onClick={() => toggleMenu(item.label, item.hasMenu)}
                    aria-expanded={isOpen}
                    className={`flex items-center gap-1 rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
                      isOpen
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="hidden shrink-0 items-center gap-3 lg:flex">
              <Link
                onClick={closeAll}
                href={account.href}
                className="rounded-full border border-border bg-accent px-5 py-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-accent"
              >
                {account.label}
              </Link>

              <Link
                onClick={closeAll}
                href="/contact?type=VisitRequest"
                className="rounded-full bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                رزرو بازدید
              </Link>
            </div>

            {/* Mobile trigger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex items-center justify-center rounded-full p-2 text-muted-foreground lg:hidden"
              aria-label="باز کردن منو"
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Desktop mega dropdown — shared across Solutions / Pricing / Resources */}
          <AnimatePresence initial={false}>
            {activeMenu && (
              <motion.div
                key={openMenu}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="hidden overflow-hidden lg:block"
              >
                <div className="grid grid-cols-[1fr_1fr_auto] gap-10 px-8 pb-8 pt-2">
                  {activeMenu.columns.map((col, colIdx) => (
                    <div key={col.eyebrow} className="flex flex-col gap-6">
                      <span className="w-fit rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground">
                        {col.eyebrow}
                      </span>
                      <ul className="flex flex-col gap-4">
                        {col.links.map((link) => (
                          <li key={link.label}>
                            <Link
                              onClick={closeAll}
                              href={link.href}
                              className={`group flex items-center gap-2 text-xl font-semibold text-foreground hover:text-muted-foreground ${
                                link.active
                                  ? "underline underline-offset-4"
                                  : ""
                              }`}
                            >
                              {link.label}
                              {link.badge && (
                                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground group-hover:bg-primary/80">
                                  {link.badge}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>

                      {/* Footer links sit under the last column */}
                      {colIdx === activeMenu.columns.length - 1 &&
                        activeMenu.footerLinks && (
                          <div className="mt-auto flex flex-col gap-2 pt-16">
                            {activeMenu.footerLinks.map((item) => (
                              <Link
                                onClick={closeAll}
                                key={item.label}
                                href={item.href}
                                className="text-sm text-muted-foreground hover:text-muted-foreground"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}

                  {/* Preview image */}
                  <div className="relative hidden h-64 w-72 flex-col justify-end overflow-hidden rounded-2xl md:flex">
                    <img
                      src={activeMenu.image.src}
                      alt={activeMenu.image.alt}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {activeMenu.imageCaption && (
                      <div className="relative z-10 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
                        <p className="text-sm font-medium text-white">
                          {activeMenu.imageCaption}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Socials — only shown when the menu opts in */}
                {activeMenu.showSocials && (
                  <div className="flex items-center gap-4 px-8 pb-8">
                    {SOCIALS.map(({ href, label, icon: Icon }) => (
                      <a
                        key={label}
                        href={href}
                        aria-label={label}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile panel */}
          <AnimatePresence initial={false}>
            {mobileOpen && (
              <motion.div
                key="mobile-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden lg:hidden"
              >
                <div className="flex flex-col gap-1 px-6 pb-6">
                  {NAV_ITEMS.map((item) =>
                    item.hasMenu ? (
                      <button
                        key={item.label}
                        onClick={() => toggleMenu(item.label, true)}
                        className="flex items-center justify-between rounded-xl px-3 py-3 text-start text-base font-medium text-muted-foreground hover:bg-accent"
                      >
                        {item.label}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            openMenu === item.label ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    ) : (
                      <Link
                        onClick={closeAll}
                        key={item.label}
                        href={item.href ?? "#"}
                        className="flex items-center justify-between rounded-xl px-3 py-3 text-start text-base font-medium text-muted-foreground hover:bg-accent"
                      >
                        {item.label}
                      </Link>
                    ),
                  )}

                  {activeMenu && (
                    <div className="ms-3 flex flex-col gap-3 border-s border-border ps-4 pt-2">
                      {activeMenu.columns.flatMap((c) =>
                        c.links.map((link) => (
                          <Link
                            onClick={closeAll}
                            key={link.label}
                            href={link.href}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            {link.label}
                            {link.badge && (
                              <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                                {link.badge}
                              </span>
                            )}
                          </Link>
                        )),
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                    <Link
                      onClick={closeAll}
                      href={account.href}
                      className="rounded-full border border-border bg-accent px-5 py-3 text-center text-[15px] font-semibold text-foreground"
                    >
                      {account.label}
                    </Link>
                    <Link
                      onClick={closeAll}
                      href="/contact?type=VisitRequest"
                      className="rounded-full bg-primary px-5 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                    >
                      رزرو بازدید
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </header>
  );
}

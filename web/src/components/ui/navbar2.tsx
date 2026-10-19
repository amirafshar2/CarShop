"use client";

// Based on the 21st.dev "navbar2" component. Menu items, mega menus (sub-links grouped into columns,
// a side image and a note) and socials all come from the site settings.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { FaInstagram, FaTelegram, FaWhatsapp } from "react-icons/fa6";
import { useSession } from "@/lib/session";
import { isStaff, mediaUrl } from "@/lib/api";
import { initials, instagramLink, telegramLink, whatsappLink, type NavLink, type SiteContent } from "@/lib/site";

type Column = { eyebrow: string; links: NavLink[] };

/** Sub-links → columns by their «group» (the column heading); links without a group go under the item's own label. */
function columnsOf(item: NavLink): Column[] {
  const cols: Column[] = [];
  for (const link of item.children ?? []) {
    const eyebrow = link.group?.trim() || item.label;
    let col = cols.find((c) => c.eyebrow === eyebrow);
    if (!col) cols.push((col = { eyebrow, links: [] }));
    col.links.push(link);
  }
  return cols;
}

const isExternal = (href: string) => /^(https?:|tel:|mailto:)/.test(href);

export default function Navbar2({ site }: { site: SiteContent }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { user } = useSession();
  const account = !user
    ? { href: "/login", label: "ورود" }
    : isStaff(user)
      ? { href: "/admin", label: "پنل مدیریت" }
      : { href: "/account", label: "حساب من" };
  const cta = site.pages.contact ? { href: "/contact", label: site.labels.requestButton } : null;
  const socials = [
    { href: instagramLink(site.contact.instagram), label: "Instagram", icon: FaInstagram },
    { href: whatsappLink(site.contact.whatsapp), label: "WhatsApp", icon: FaWhatsapp },
    { href: telegramLink(site.contact.telegram), label: "Telegram", icon: FaTelegram },
  ].filter((s) => s.href) as { href: string; label: string; icon: typeof FaInstagram }[];

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

  const hasMenu = (item: NavLink) => (item.children?.length ?? 0) > 0;
  const toggleMenu = (label: string) => setOpenMenu((current) => (current === label ? null : label));
  const active = site.nav.find((n) => n.label === openMenu && hasMenu(n)) ?? null;
  const activeColumns = active ? columnsOf(active) : [];
  const activeIndex = active ? site.nav.filter(hasMenu).indexOf(active) : -1;

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-4">
      <div className="w-full max-w-7xl">
        <motion.div
          layout
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-3xl border border-border bg-background/95 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          {/* Top row */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8">
            <Link href="/" onClick={closeAll} className="flex min-w-0 shrink items-center gap-2">
              {site.brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(site.brand.logoUrl)} alt="" className="h-10 w-auto max-w-[140px] object-contain" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                  {initials(site.brand.name || "S")}
                </span>
              )}
              <span className="truncate text-[1.2rem] font-bold tracking-tight text-foreground">{site.brand.name}</span>
            </Link>

            {/* Desktop nav */}
            <nav aria-label="منوی اصلی" className="hidden items-center gap-1 lg:flex">
              {site.nav.map((item) => {
                const isOpen = openMenu === item.label;
                if (!hasMenu(item)) {
                  return (
                    <Link
                      onClick={closeAll}
                      key={item.label + item.href}
                      href={item.href}
                      className="rounded-full px-4 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.label + item.href}
                    onClick={() => toggleMenu(item.label)}
                    aria-expanded={isOpen}
                    className={`flex items-center gap-1 rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
                      isOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="hidden shrink-0 items-center gap-3 lg:flex">
              <Link
                onClick={closeAll}
                href={account.href}
                className="rounded-full border border-border bg-accent px-5 py-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-accent"
              >
                {account.label}
              </Link>
              {cta && (
                <Link
                  onClick={closeAll}
                  href={cta.href}
                  className="rounded-full bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {cta.label}
                </Link>
              )}
            </div>

            {/* Mobile trigger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex items-center justify-center rounded-full p-2 text-muted-foreground lg:hidden"
              aria-label={mobileOpen ? "بستن منو" : "باز کردن منو"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Desktop mega dropdown */}
          <AnimatePresence initial={false}>
            {active && (
              <motion.div
                key={openMenu}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="hidden overflow-hidden lg:block"
              >
                <div className={`grid gap-10 px-8 pb-8 pt-2 ${activeColumns.length > 1 ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-[1fr_auto]"}`}>
                  {activeColumns.slice(0, 2).map((col, colIdx) => (
                    <div key={col.eyebrow} className="flex flex-col gap-6">
                      <span className="w-fit rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground">{col.eyebrow}</span>
                      <ul className="flex flex-col gap-4">
                        {col.links.map((link, i) => (
                          <li key={link.label + link.href}>
                            <Link
                              onClick={closeAll}
                              href={link.href}
                              className={`group flex items-center gap-2 text-xl font-semibold text-foreground hover:text-muted-foreground ${
                                colIdx === 0 && i === 0 ? "underline underline-offset-4" : ""
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

                      {/* The note sits under the last column */}
                      {colIdx === Math.min(activeColumns.length, 2) - 1 && active.note && (
                        <div className="mt-auto flex flex-col gap-2 pt-16">
                          <Link onClick={closeAll} href={active.href} className="text-sm text-muted-foreground hover:text-muted-foreground">
                            {active.note}
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Preview image */}
                  {active.imageUrl ? (
                    <div className="relative hidden h-64 w-72 flex-col justify-end overflow-hidden rounded-2xl md:flex">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(active.imageUrl)} alt={active.caption ?? active.label} className="absolute inset-0 h-full w-full object-cover" />
                      {active.caption && (
                        <div className="relative z-10 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
                          <p className="text-sm font-medium text-white">{active.caption}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div />
                  )}
                </div>

                {/* Socials under the first mega menu */}
                {activeIndex === 0 && socials.length > 0 && (
                  <div className="flex items-center gap-4 px-8 pb-8">
                    {socials.map(({ href, label, icon: Icon }) => (
                      <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
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
                  {site.nav.map((item) =>
                    hasMenu(item) ? (
                      <div key={item.label + item.href}>
                        <button
                          onClick={() => toggleMenu(item.label)}
                          aria-expanded={openMenu === item.label}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-start text-base font-medium text-muted-foreground hover:bg-accent"
                        >
                          {item.label}
                          <ChevronDown className={`h-4 w-4 transition-transform ${openMenu === item.label ? "rotate-180" : ""}`} />
                        </button>
                        {openMenu === item.label && (
                          <div className="ms-3 flex flex-col gap-3 border-s border-border ps-4 pb-2 pt-2">
                            {(item.children ?? []).map((link) => (
                              <Link onClick={closeAll} key={link.label + link.href} href={link.href} className="flex items-center gap-2 text-sm text-muted-foreground">
                                {link.label}
                                {link.badge && <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">{link.badge}</span>}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        onClick={closeAll}
                        key={item.label + item.href}
                        href={item.href}
                        className="flex items-center justify-between rounded-xl px-3 py-3 text-start text-base font-medium text-muted-foreground hover:bg-accent"
                      >
                        {item.label}
                      </Link>
                    ),
                  )}

                  {socials.length > 0 && (
                    <div className="flex gap-5 px-3 py-3">
                      {socials.map(({ href, label, icon: Icon }) => (
                        <a key={label} href={href} aria-label={label} target={isExternal(href) ? "_blank" : undefined} rel="noopener noreferrer" className="text-muted-foreground">
                          <Icon className="h-6 w-6" />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                    <Link onClick={closeAll} href={account.href} className="rounded-full border border-border bg-accent px-5 py-3 text-center text-[15px] font-semibold text-foreground">
                      {account.label}
                    </Link>
                    {cta && (
                      <Link onClick={closeAll} href={cta.href} className="rounded-full bg-primary px-5 py-2.5 text-center text-sm font-semibold text-primary-foreground">
                        {cta.label}
                      </Link>
                    )}
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

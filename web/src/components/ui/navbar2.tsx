"use client";

// Based on the 21st.dev "navbar2" component; mega menus removed, everything comes from the site settings.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { FaInstagram, FaTelegram, FaWhatsapp } from "react-icons/fa6";
import { useSession } from "@/lib/session";
import { isStaff, mediaUrl } from "@/lib/api";
import { initials, instagramLink, telegramLink, whatsappLink, type SiteContent } from "@/lib/site";

export default function Navbar2({ site }: { site: SiteContent }) {
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

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [mobileOpen]);

  const close = () => setMobileOpen(false);

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-4">
      <div className="w-full max-w-7xl">
        <motion.div
          layout
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-3xl border border-border bg-background/95 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-8 sm:py-4">
            <Link href="/" onClick={close} className="flex min-w-0 shrink items-center gap-2.5">
              {site.brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(site.brand.logoUrl)} alt="" className="h-10 w-auto max-w-[140px] object-contain" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                  {initials(site.brand.name || "S")}
                </span>
              )}
              <span className="truncate text-[1.15rem] font-bold tracking-tight text-foreground">{site.brand.name}</span>
            </Link>

            <nav aria-label="منوی اصلی" className="hidden items-center gap-1 lg:flex">
              {site.nav.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden shrink-0 items-center gap-3 lg:flex">
              {socials.map(({ href, label, icon: Icon }) => (
                <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
              <Link href={account.href} className="rounded-full border border-border bg-accent px-5 py-3 text-[15px] font-semibold text-foreground">
                {account.label}
              </Link>
              {cta && (
                <Link href={cta.href} className="rounded-full bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                  {cta.label}
                </Link>
              )}
            </div>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex items-center justify-center rounded-full p-2 text-muted-foreground lg:hidden"
              aria-label={mobileOpen ? "بستن منو" : "باز کردن منو"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

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
                <div className="flex flex-col gap-1 px-5 pb-6">
                  {site.nav.map((item) => (
                    <Link onClick={close} key={item.href + item.label} href={item.href} className="rounded-xl px-3 py-3 text-base font-medium text-muted-foreground hover:bg-accent">
                      {item.label}
                    </Link>
                  ))}
                  {socials.length > 0 && (
                    <div className="flex gap-5 px-3 py-3">
                      {socials.map(({ href, label, icon: Icon }) => (
                        <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer" className="text-muted-foreground">
                          <Icon className="h-6 w-6" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-3 border-t border-border pt-4">
                    <Link onClick={close} href={account.href} className="rounded-full border border-border bg-accent px-5 py-3 text-center text-[15px] font-semibold text-foreground">
                      {account.label}
                    </Link>
                    {cta && (
                      <Link onClick={close} href={cta.href} className="rounded-full bg-primary px-5 py-3 text-center text-[15px] font-semibold text-primary-foreground">
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

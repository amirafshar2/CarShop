import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import Navbar2 from "@/components/ui/navbar2";
import FooterWithSuite from "@/components/ui/footer-with-suite";
import { Toaster } from "@/components/ui/sonner";
import HideOnAdmin from "@/components/app/hide-on-admin";
import SiteGate from "@/components/site/site-gate";
import { getSite, themeVars } from "@/lib/site";
import { mediaUrl } from "@/lib/api";
import "./globals.css";

export const dynamic = "force-dynamic"; // brand, colours and menu are edited live from the panel

export async function generateMetadata(): Promise<Metadata> {
  const { content: c } = await getSite();
  const name = c.brand.name || "سایت";
  return {
    title: { default: c.seo.title || (c.brand.tagline ? `${name} | ${c.brand.tagline}` : name), template: `%s | ${name}` },
    description: c.seo.description || c.brand.description || undefined,
    openGraph: { locale: "fa_IR", type: "website", siteName: name, images: c.home.heroImageUrl ? [mediaUrl(c.home.heroImageUrl)] : undefined },
    icons: c.brand.logoUrl ? { icon: mediaUrl(c.brand.logoUrl) } : undefined,
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { content: c } = await getSite();
  return { themeColor: c.theme.mode === "dark" ? "#0a0a0b" : "#ffffff", colorScheme: c.theme.mode };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSite();
  const c = site.content;
  const year = new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(new Date().getFullYear());
  // Footer: plain menu items plus the sub-links of mega menus (no duplicates).
  const footerLinks = c.nav
    .flatMap((n) => (n.children?.length ? n.children : [n]))
    .filter((n, i, all) => !/^(tel:|mailto:)/.test(n.href) && all.findIndex((x) => x.href === n.href) === i)
    .slice(0, 10)
    .map((n) => ({ text: n.label, url: n.href }));
  const social = [
    c.contact.instagram && { text: "اینستاگرام", url: `https://instagram.com/${c.contact.instagram}` },
    c.contact.whatsapp && { text: "واتساپ", url: `https://wa.me/${c.contact.whatsapp}` },
    c.contact.telegram && { text: "تلگرام", url: `https://t.me/${c.contact.telegram}` },
    c.contact.phone && { text: c.contact.phone, url: `tel:${c.contact.phone}` },
  ].filter(Boolean) as { text: string; url: string }[];

  return (
    <html lang="fa" dir="rtl" className={c.theme.mode === "dark" ? "dark" : ""} style={themeVars(c.theme) as React.CSSProperties} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" forcedTheme={c.theme.mode} enableSystem={false}>
          <SiteGate published={site.isPublished} brand={c.brand.name} tagline={c.brand.tagline}>
            <HideOnAdmin>
              <Navbar2 site={c} />
            </HideOnAdmin>
            <main>{children}</main>
            <HideOnAdmin>
              <FooterWithSuite
                brandName={c.brand.name || " "}
                tagline={c.brand.tagline ?? ""}
                description={c.footer.text ?? c.brand.description ?? ""}
                navLinks={footerLinks}
                socialLinks={social}
                question={c.home.ctaTitle ?? "سؤالی دارید؟ با ما در تماس باشید."}
                ctaText={c.labels.requestButton}
                ctaUrl="/contact"
                email={c.contact.address ?? c.contact.email ?? ""}
                copyright={c.footer.copyright ?? `© ${year} ${c.brand.name}`}
              />
            </HideOnAdmin>
          </SiteGate>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

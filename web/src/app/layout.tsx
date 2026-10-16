import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import Navbar2 from "@/components/ui/navbar2";
import FooterWithSuite from "@/components/ui/footer-with-suite";
import { Toaster } from "@/components/ui/sonner";
import HideOnAdmin from "@/components/app/hide-on-admin";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "مروجی موتورز | خرید و فروش خودرو در شیراز", template: "%s | مروجی موتورز" },
  description: "مشاور خرید و فروش خودرو — از انتخاب تا تعویض پلاک. موجودی روز، خرید از راه دور، گذر موقت، فروش حواله و دیتیلینگ. شیراز، چهارراه زرگری، برج بارانا.",
  openGraph: { locale: "fa_IR", type: "website", siteName: "مروجی موتورز" },
};

export const viewport: Viewport = { themeColor: "#0a0a0b", colorScheme: "dark" };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  name: "مروجی موتورز",
  telephone: "+989171006003",
  address: { "@type": "PostalAddress", streetAddress: "چهارراه زرگری، برج بارانا، طبقه اول", addressLocality: "شیراز", addressCountry: "IR" },
  sameAs: ["https://www.instagram.com/moraveji.motors"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false}>
          <HideOnAdmin>
            <Navbar2 />
          </HideOnAdmin>
          <main>{children}</main>
          <HideOnAdmin>
          <FooterWithSuite
            brandName="مروجی موتورز"
            tagline="از انتخاب تا تعویض پلاک."
            description="مشاور خرید و فروش خودرو در شیراز — موجودی روز، خرید از راه دور، گذر موقت، حواله و دیتیلینگ."
            navLinks={[
              { text: "خانه", url: "/" },
              { text: "موجودی", url: "/inventory" },
              { text: "گذر موقت", url: "/inventory?listingType=TemporaryPass" },
              { text: "حواله", url: "/inventory?listingType=Hawaleh" },
              { text: "خدمات و قیمت‌ها", url: "/services" },
              { text: "خرید از راه دور", url: "/#remote-buy" },
              { text: "ماشینت رو بفروش", url: "/contact?type=SellMyCar" },
              { text: "تماس", url: "/contact" },
            ]}
            socialLinks={[
              { text: "اینستاگرام", url: "https://www.instagram.com/moraveji.motors" },
              { text: "دیتیلینگ", url: "https://www.instagram.com/moravejimotors_detailing" },
              { text: "واتساپ", url: "https://wa.me/989171006003" },
              { text: "۰۹۱۷۱۰۰۶۰۰۳", url: "tel:09171006003" },
            ]}
            question="سؤالی درباره‌ی خرید یا فروش خودرو دارید؟ با ما در تماس باشید."
            ctaText="رزرو بازدید"
            ctaUrl="/contact?type=VisitRequest"
            email="شیراز، چهارراه زرگری، برج بارانا، طبقه اول"
            copyright={`© ${new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(new Date().getFullYear())} شرکت بازرگانی مروجی موتورز`}
          />
          </HideOnAdmin>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}

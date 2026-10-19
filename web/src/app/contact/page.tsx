import type { Metadata } from "next";
import { Suspense } from "react";
import { getSite } from "@/lib/site";
import ContactInner from "./contact-inner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تماس با ما" };

export default async function ContactPage() {
  const { content } = await getSite();
  return (
    <Suspense>
      <ContactInner site={content} />
    </Suspense>
  );
}

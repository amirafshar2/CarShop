"use client";

import { usePathname } from "next/navigation";

/** The public navbar and footer are not shown inside the admin panel (it has its own sidebar). */
export default function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return path?.startsWith("/admin") ? null : <>{children}</>;
}

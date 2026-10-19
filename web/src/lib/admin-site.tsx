"use client";

import { createContext, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { SiteContent } from "@/lib/site";

export type PresetInfo = { key: string; title: string; description: string; icon: string };
export type SetupProgress = { hasName: boolean; hasLogo: boolean; hasContact: boolean; hasHero: boolean; listings: number; services: number; isPublished: boolean };
export type AdminSite = {
  preset: string; content: SiteContent; isPublished: boolean; setupCompleted: boolean; completedSteps: string[];
  presets: PresetInfo[]; progress: SetupProgress; version: string;
};

type Ctx = {
  site: AdminSite | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  /** Saves the whole content document and reloads. */
  save: (content: SiteContent) => Promise<void>;
  step: (name: string) => Promise<void>;
};

const AdminSiteContext = createContext<Ctx | null>(null);

export function AdminSiteProvider({ children }: { children: React.ReactNode }) {
  const { data, error, loading, reload: load } = useApi<AdminSite>("/api/v1/admin/site");
  const router = useRouter();
  // Re-render the server layout too, so colours / dark-light mode follow the new settings at once.
  const reload = useCallback(async () => { await load(); router.refresh(); }, [load, router]);
  const save = useCallback(async (content: SiteContent) => {
    await apiSend("/api/v1/admin/site", "PUT", { content, version: data?.version ?? null });
    await reload();
  }, [data?.version, reload]);
  const step = useCallback(async (name: string) => {
    await apiSend("/api/v1/admin/site/setup/step", "POST", { step: name });
  }, []);
  return <AdminSiteContext.Provider value={{ site: data, error, loading, reload, save, step }}>{children}</AdminSiteContext.Provider>;
}

export function useAdminSite() {
  const ctx = useContext(AdminSiteContext);
  if (!ctx) throw new Error("useAdminSite outside AdminSiteProvider");
  return ctx;
}

/** Immutable deep update helper for the content form. */
export function patch<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone: Record<string, unknown> = Array.isArray(obj) ? ([...obj] as unknown as Record<string, unknown>) : { ...(obj as Record<string, unknown>) };
  const [head, ...rest] = keys;
  clone[head] = rest.length ? patch(clone[head], rest.join("."), value) : value;
  return clone as T;
}

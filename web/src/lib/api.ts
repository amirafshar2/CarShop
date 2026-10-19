/** Browser base URL ("" = same origin, used in the Docker/Render deploy where /api is proxied). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";
/** Server-side base URL (inside the container the API listens on localhost). */
const SERVER_API_URL = process.env.API_INTERNAL_URL ?? (API_URL || "http://localhost:5080");

export type PriceType = "Fixed" | "From" | "OnCall";
export type ListingStatus = "Draft" | "Published" | "Hidden" | "SoldOut";
export type Listing = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  summary: string | null;
  description: string | null;
  priceType: PriceType;
  priceRial: number | null;
  originalPriceRial: number | null;
  unit: string | null;
  badge: string | null;
  images: string[];
  attributes: Record<string, string>;
  status: ListingStatus;
  isFeatured: boolean;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  version: string;
};

export type Paged<T> = { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number };

/** Absolute URL for uploaded files when the API runs on another origin (dev); same-origin in the container. */
export const mediaUrl = (u: string | null | undefined) => (!u ? "" : u.startsWith("/api/") ? `${API_URL}${u}` : u);

/** Server-side read. No Next.js data cache: the API caches itself and invalidates on every admin change,
 *  so prices/status edited in the panel are visible immediately. */
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // API offline → pages show a friendly empty state instead of crashing
  }
}

export const getListings = (query = "") => get<Paged<Listing>>(`/api/v1/listings${query ? `?${query}` : ""}`);
export const getListing = (slug: string) => get<Listing>(`/api/v1/listings/${encodeURIComponent(slug)}`);
export const getSiteRaw = <T,>() => get<T>(`/api/v1/site`);

export type LeadType = "General" | "ItemRequest" | "ServiceRequest" | "Booking";
export type LeadStatus = "New" | "Contacted" | "Visit" | "Won" | "Lost";

const TOO_MANY = "تعداد درخواست‌ها زیاد بود. چند دقیقه‌ی دیگر دوباره تلاش کنید.";
const OFFLINE = "ارتباط با سرور برقرار نشد. مطمئن شوید API (بک‌اند روی پورت ۵۰۸۰) روشن است و دوباره تلاش کنید.";

/** fetch that turns network failures ("Failed to fetch") into a clear Persian message. */
async function call(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error(OFFLINE);
  }
}

/** Reads a ProblemDetails body and throws its Persian message. */
async function fail(res: Response, fallback: string): Promise<never> {
  if (res.status === 429) throw new Error(TOO_MANY);
  const body = await res.json().catch(() => null);
  const first = body?.errors ? (Object.values(body.errors as Record<string, string[]>)[0]?.[0] ?? null) : null;
  if (res.status === 403) throw new Error("شما به این بخش دسترسی ندارید.");
  throw new Error(first ?? body?.title ?? fallback);
}

export async function createLead(input: { name: string; phone: string; type: LeadType; listingId?: string; message?: string }) {
  const res = await call(`/api/v1/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await fail(res, "ارسال انجام نشد.");
}

// ---------- Auth (access token in memory, refresh token in HttpOnly cookie) ----------
export type SessionUser = { id: string; phone: string; fullName: string | null; roles: string[] };
type AuthResponse = { accessToken: string; expiresAt: string; user: SessionUser };

let accessToken: string | null = null;
let currentUser: SessionUser | null = null;
let restored = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getAccessToken = () => accessToken;
export const getSessionUser = () => currentUser;
export const isSessionRestored = () => restored;
export const subscribeSession = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const isStaff = (u: SessionUser | null) => !!u && (u.roles.includes("Admin") || u.roles.includes("Staff"));
export const isAdmin = (u: SessionUser | null) => !!u && u.roles.includes("Admin");

function setSession(r: AuthResponse | null) {
  accessToken = r?.accessToken ?? null;
  currentUser = r?.user ?? null;
  restored = true;
  emit();
}

let refreshing: Promise<boolean> | null = null;
/** Single-flight: parallel callers share one refresh, otherwise the rotated cookie would look like token reuse. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        setSession(null);
        return false;
      }
      setSession((await res.json()) as AuthResponse);
      return true;
    } catch {
      restored = true;
      emit();
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

/** Authenticated request: adds the bearer token and transparently refreshes it once on 401. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!accessToken) await refreshSession();
  const send = () =>
    call(path, {
      ...init,
      headers: { ...(typeof init.body === "string" ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}), ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
    });
  let res = await send();
  if (res.status === 401 && (await refreshSession())) res = await send();
  if (res.status === 401) throw new Error("لطفاً دوباره وارد شوید.");
  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await authFetch(path);
  if (!res.ok) await fail(res, "دریافت اطلاعات انجام نشد.");
  return (await res.json()) as T;
}

export async function apiSend<T = void>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const res = await authFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) await fail(res, "عملیات انجام نشد.");
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function requestOtp(phone: string) {
  const res = await call(`/api/v1/auth/otp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) await fail(res, "ارسال کد انجام نشد.");
  return (await res.json()) as { expiresInSeconds: number; resendAfterSeconds: number; devCode?: string | null };
}

export async function verifyOtp(phone: string, code: string, fullName?: string) {
  const res = await call(`/api/v1/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ phone, code, fullName }),
  });
  if (!res.ok) await fail(res, "کد تأیید نادرست است.");
  const body = (await res.json()) as AuthResponse;
  setSession(body);
  return body;
}

/** Presentation helper: one-click admin/staff login (dev: free, public demo: needs the access key). */
export async function getDemoInfo(): Promise<{ enabled: boolean; requiresKey: boolean }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/demo`);
    return res.ok ? await res.json() : { enabled: false, requiresKey: false };
  } catch {
    return { enabled: false, requiresKey: false };
  }
}

export async function demoLogin(role: "Admin" | "Staff", key?: string) {
  const res = await call(`/api/v1/auth/demo-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role, key }),
  });
  if (!res.ok) await fail(res, "ورود نمایشی انجام نشد.");
  const body = (await res.json()) as AuthResponse;
  setSession(body);
  return body;
}

export async function logout() {
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    /* offline: still clear the local session */
  }
  setSession(null);
}

// ---------- Services (public price list) ----------
export type ServicePriceType = PriceType;
export type ServiceItem = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  features: string[];
  priceType: ServicePriceType;
  priceRial: number | null;
  originalPriceRial: number | null;
  unit: string | null;
  badge: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  version: string;
};
export const getServices = () => get<ServiceItem[]>(`/api/v1/services`);

// ---------- Customer panel ----------
export type Me = SessionUser & { createdAt: string };
export type MyLead = { id: string; type: LeadType; message: string | null; status: LeadStatus; createdAt: string; listingTitle: string | null; listingSlug: string | null };

// ---------- Admin panel ----------
export type Lead = { id: string; name: string; phone: string; type: LeadType; listingId: string | null; message: string | null; status: LeadStatus; assignedStaffId: string | null; createdAt: string };
export type DashboardStats = {
  listingsPublished: number; listingsDraft: number; listingsHidden: number; listingsSoldOut: number;
  leadsNew: number; leadsTotal: number; activeServices: number; customers: number; recentLeads: Lead[];
};
export type AdminUser = { id: string; phone: string; fullName: string | null; roles: string[]; createdAt: string };

/** Uploads an image/video from the panel; returns its URL (/api/v1/files/…). */
export type UploadResult = { url: string; video: boolean; optimizing: boolean };

export async function uploadMedia(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await authFetch(`/api/v1/admin/uploads`, { method: "POST", body: form });
  if (!res.ok) await fail(res, "آپلود انجام نشد.");
  return (await res.json()) as UploadResult;
}

export const uploadFile = async (file: File) => (await uploadMedia(file)).url;

/** Id of an uploaded file from its URL (/api/v1/files/{id}.mp4), or null for outside links. */
export const uploadId = (url: string | null | undefined) => url?.match(/^\/api\/v1\/files\/([a-f0-9]{32})\.mp4$/)?.[1] ?? null;

/** Is the background optimisation of an uploaded video finished? */
export async function getUploadStatus(id: string): Promise<{ ready: boolean; poster: string | null }> {
  const res = await authFetch(`/api/v1/admin/uploads/${id}/status`);
  if (!res.ok) await fail(res, "وضعیت ویدیو خوانده نشد.");
  return res.json();
}

// ---------- First admin / admin key sign-in ----------
export async function getSetupStatus(): Promise<{ hasAdmin: boolean; requiresKey: boolean } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/setup`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function claimAdmin(phone: string, fullName: string | undefined, key: string | undefined) {
  const res = await call(`/api/v1/auth/setup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ phone, fullName, key }),
  });
  if (!res.ok) await fail(res, "ورود انجام نشد.");
  const body = (await res.json()) as AuthResponse;
  setSession(body);
  return body;
}

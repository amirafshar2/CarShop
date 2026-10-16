import { demoPhotoFor, unsplash } from "@/lib/media";

/** Browser base URL ("" = same origin, used in the Docker/Render deploy where /api is proxied). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";
/** Server-side base URL (inside the container the API listens on localhost). */
const SERVER_API_URL = process.env.API_INTERNAL_URL ?? (API_URL || "http://localhost:5080");

export type CarListItem = {
  id: string;
  slug: string;
  titleFa: string;
  brandEn: string;
  modelEn: string;
  modelYear: number;
  yearCalendar: "Gregorian" | "Solar";
  condition: "New" | "Used";
  listingType: "Regular" | "TemporaryPass" | "Hawaleh";
  mileageKm: number;
  colors: string;
  priceRial: number | null;
  priceOnCall: boolean;
  tags: string;
  status: "Available" | "Reserved";
  coverImageUrl: string | null;
};

export type CarDetail = CarListItem & {
  trim: string | null;
  package: string | null;
  faceliftYear: number | null;
  originCountry: string | null;
  transmission: string;
  fuelType: string;
  drivetrain: string;
  description: string | null;
  bodyCondition: string | null;
  temporaryPassMonths: number | null;
  temporaryPassExpiresOn: string | null;
  freeZone: string | null;
  hawalehType: string | null;
  hawalehDeliveryOn: string | null;
  images: { url: string; alt: string | null; isCover: boolean }[];
};

export type Paged<T> = { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number };

/** Cover image: the dealer's upload if present, otherwise an illustrative demo photo. */
export const coverOf = (c: Pick<CarListItem, "coverImageUrl" | "brandEn" | "modelEn">, w = 1200) =>
  c.coverImageUrl ?? unsplash(demoPhotoFor(c.brandEn, c.modelEn), w);

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

export const getCars = (query = "") => get<Paged<CarListItem>>(`/api/v1/cars${query ? `?${query}` : ""}`);
export const getCar = (slug: string) => get<CarDetail>(`/api/v1/cars/${encodeURIComponent(slug)}`);

export type LeadType = "PriceRequest" | "VisitRequest" | "SellMyCar" | "Sourcing" | "Hawaleh" | "Detailing" | "Organization" | "General";
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

export async function createLead(input: { name: string; phone: string; type: LeadType; carId?: string; message?: string }) {
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
      headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}), ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
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

export async function reserveCar(carId: string) {
  const res = await authFetch(`/api/v1/cars/${carId}/reservations`, { method: "POST" }).catch((e: Error) => {
    if (e.message.includes("وارد")) throw new Error("برای رزرو، ابتدا وارد شوید.");
    throw e;
  });
  if (!res.ok) await fail(res, "رزرو انجام نشد.");
  return (await res.json()) as { id: string; expiresAt: string; depositRial: number };
}

// ---------- Services (public price list) ----------
export type ServiceCategory = "Detailing" | "Purchase" | "Paperwork" | "Other";
export type ServicePriceType = "Fixed" | "From" | "OnCall";
export type ServiceItem = {
  id: string;
  title: string;
  category: ServiceCategory;
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
export type MyReservation = {
  id: string; carId: string; carTitle: string; carSlug: string; coverImageUrl: string | null;
  reservedAt: string; expiresAt: string; depositRial: number; status: "Active" | "Converted" | "Expired" | "Cancelled";
};
export type MyLead = { id: string; type: LeadType; message: string | null; status: LeadStatus; createdAt: string; carTitle: string | null };

// ---------- Admin panel ----------
export type Lead = { id: string; name: string; phone: string; type: LeadType; carId: string | null; message: string | null; status: LeadStatus; assignedStaffId: string | null; createdAt: string };
export type DashboardStats = {
  carsAvailable: number; carsReserved: number; carsSold: number; carsHidden: number; carsDraft: number;
  leadsNew: number; leadsTotal: number; activeReservations: number; activeServices: number; customers: number; recentLeads: Lead[];
};
export type CarStatus = "Draft" | "Available" | "Reserved" | "Sold" | "Hidden";
export type AdminCarRow = {
  id: string; slug: string; titleFa: string; brandEn: string; modelEn: string; modelYear: number; condition: "New" | "Used";
  listingType: CarListItem["listingType"]; priceRial: number | null; priceOnCall: boolean; status: CarStatus;
  coverImageUrl: string | null; createdAt: string; updatedAt: string | null;
};
export type AdminCarDetail = { car: Omit<CarDetail, "status"> & { version: string; status: CarStatus }; vin: string | null };
export type AdminUser = { id: string; phone: string; fullName: string | null; roles: string[]; createdAt: string };

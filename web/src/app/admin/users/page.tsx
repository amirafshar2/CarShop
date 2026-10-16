"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminHeader, LoadState } from "@/components/app/admin-page";
import { apiSend, isAdmin, type AdminUser, type Paged } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import { fa } from "@/lib/format";
import { faDate, roleLabels } from "@/lib/labels";

const ROLES = ["Admin", "Staff", "Customer"] as const;
const mainRole = (roles: string[]) => (roles.includes("Admin") ? "Admin" : roles.includes("Staff") ? "Staff" : "Customer");

export default function AdminUsersPage() {
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [adding, setAdding] = useState(false);
  const [newUser, setNewUser] = useState({ phone: "", fullName: "", role: "Staff" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const qs = new URLSearchParams({ pageSize: "50" });
  if (query) qs.set("search", query);
  if (role !== "all") qs.set("role", role);
  const { data, error, loading, reload } = useApi<Paged<AdminUser>>(isAdmin(user) ? `/api/v1/admin/users?${qs.toString()}` : null);

  if (!isAdmin(user)) return <p className="text-muted-foreground">فقط مدیر به این بخش دسترسی دارد.</p>;

  const changeRole = async (u: AdminUser, next: string) => {
    try {
      await apiSend(`/api/v1/admin/users/${u.id}/role`, "PUT", { role: next });
      toast.success(`نقش ${u.fullName ?? u.phone} شد: ${roleLabels[next]} (بعد از ورود دوباره‌ی او اعمال می‌شود)`);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
      await reload();
    }
  };

  const add = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await apiSend(`/api/v1/admin/users`, "POST", { ...newUser, fullName: newUser.fullName || null });
      toast.success("کاربر اضافه شد. با همین شماره و کد پیامکی وارد می‌شود.");
      setAdding(false);
      setNewUser({ phone: "", fullName: "", role: "Staff" });
      await reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminHeader
        title="کاربران و کارمندان"
        description={data ? `${fa(data.totalCount)} کاربر` : "نقش هر نفر را تعیین کنید: مدیر، کارشناس یا مشتری."}
        actions={<Button onClick={() => { setFormError(null); setAdding(true); }}><Plus className="me-1.5 size-4" />افزودن کارمند</Button>}
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <form className="flex flex-1 gap-2" role="search" onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی نام یا موبایل" aria-label="جستجو" className="sm:max-w-xs" />
          <Button type="submit" variant="outline" size="icon" aria-label="جستجو"><Search className="size-4" /></Button>
        </form>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="sm:w-48" aria-label="فیلتر نقش"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه‌ی نقش‌ها</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>موبایل</TableHead>
                <TableHead>عضویت</TableHead>
                <TableHead className="min-w-40">نقش</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold">{u.fullName ?? "—"}{u.id === user?.id && <span className="ms-2 text-xs text-primary">(شما)</span>}</TableCell>
                  <TableCell dir="ltr" className="text-end">{u.phone}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{faDate(u.createdAt)}</TableCell>
                  <TableCell>
                    <Select value={mainRole(u.roles)} onValueChange={(v) => void changeRole(u, v)} disabled={u.id === user?.id}>
                      <SelectTrigger className="h-10 text-sm" aria-label={`نقش ${u.fullName ?? u.phone}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {data.items.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">کاربری پیدا نشد.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن کارمند / کاربر</DialogTitle>
            <DialogDescription>شخص با همین شماره و کد پیامکی وارد پنل می‌شود؛ رمز عبوری لازم نیست.</DialogDescription>
          </DialogHeader>
          <form id="user-form" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void add(); }}>
            <div className="grid gap-2"><Label htmlFor="u-phone">شماره موبایل</Label><Input id="u-phone" dir="ltr" inputMode="tel" placeholder="09xxxxxxxxx" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} required /></div>
            <div className="grid gap-2"><Label htmlFor="u-name">نام (اختیاری)</Label><Input id="u-name" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>نقش</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger aria-label="نقش"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>انصراف</Button>
            <Button type="submit" form="user-form" disabled={busy}>{busy ? "در حال ذخیره…" : "افزودن"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

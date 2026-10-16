"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, Search, Trash2, BadgeCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminHeader, LoadState, StatusPill } from "@/components/app/admin-page";
import { apiSend, coverOf, isAdmin, type AdminCarRow, type CarStatus, type Paged } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import { fa, faNum, toman } from "@/lib/format";
import { carStatusColor, carStatusLabels } from "@/lib/labels";

const TABS: (CarStatus | "all")[] = ["all", "Available", "Reserved", "Hidden", "Draft", "Sold"];

export default function AdminCarsPage() {
  const { user } = useSession();
  const admin = isAdmin(user);
  const [status, setStatus] = useState<CarStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ car: AdminCarRow; kind: "delete" | "sold" } | null>(null);

  const qs = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (status !== "all") qs.set("status", status);
  if (query) qs.set("search", query);
  const { data, error, loading, reload } = useApi<Paged<AdminCarRow>>(`/api/v1/admin/cars?${qs.toString()}`);

  const act = async (car: AdminCarRow, action: "Publish" | "Hide" | "MarkSold") => {
    try {
      await apiSend(`/api/v1/admin/cars/${car.id}/status`, "POST", { action });
      toast.success({ Publish: "در سایت منتشر شد.", Hide: "از سایت پنهان شد.", MarkSold: "به‌عنوان فروخته‌شده ثبت شد." }[action]);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doConfirm = async () => {
    if (!confirm) return;
    if (confirm.kind === "sold") await act(confirm.car, "MarkSold");
    else {
      try {
        await apiSend(`/api/v1/admin/cars/${confirm.car.id}`, "DELETE");
        toast.success("خودرو حذف شد.");
        await reload();
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    setConfirm(null);
  };

  return (
    <>
      <AdminHeader
        title="خودروها"
        description={data ? `${fa(data.totalCount)} خودرو` : undefined}
        actions={<Button asChild><Link href="/admin/cars/new"><Plus className="me-1.5 size-4" />افزودن خودرو</Link></Button>}
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status} onValueChange={(v) => { setStatus(v as CarStatus | "all"); setPage(1); }}>
          <TabsList className="h-auto flex-wrap">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="px-3 py-2 text-sm">{t === "all" ? "همه" : carStatusLabels[t]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <form className="flex gap-2" role="search" onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); setPage(1); }}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی عنوان، برند، مدل…" aria-label="جستجو" className="lg:w-72" />
          <Button type="submit" variant="outline" size="icon" aria-label="جستجو"><Search className="size-4" /></Button>
        </form>
      </div>

      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>خودرو</TableHead>
                  <TableHead>مدل</TableHead>
                  <TableHead>قیمت</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-end">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverOf(c, 200)} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{c.titleFa}</div>
                          <div className="text-xs text-muted-foreground" dir="ltr">{c.brandEn} {c.modelEn}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{faNum(c.modelYear)} · {c.condition === "New" ? "صفر" : "کارکرده"}</TableCell>
                    <TableCell className="whitespace-nowrap font-semibold">{c.priceOnCall ? "قیمت تماس" : toman(c.priceRial)}</TableCell>
                    <TableCell><StatusPill className={carStatusColor[c.status]}>{carStatusLabels[c.status]}</StatusPill></TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm"><Link href={`/admin/cars/${c.id}`}><Pencil className="me-1.5 size-4" />ویرایش</Link></Button>
                        {admin && (
                          <DropdownMenu dir="rtl">
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" aria-label={`عملیات بیشتر برای ${c.titleFa}`}><MoreHorizontal className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-48">
                              {(c.status === "Available" || c.status === "Reserved") && (
                                <DropdownMenuItem asChild><a href={`/cars/${c.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="me-2 size-4" />مشاهده در سایت</a></DropdownMenuItem>
                              )}
                              {(c.status === "Hidden" || c.status === "Draft") && (
                                <DropdownMenuItem onSelect={() => void act(c, "Publish")}><Eye className="me-2 size-4" />انتشار در سایت</DropdownMenuItem>
                              )}
                              {c.status === "Available" && (
                                <DropdownMenuItem onSelect={() => void act(c, "Hide")}><EyeOff className="me-2 size-4" />پنهان کردن</DropdownMenuItem>
                              )}
                              {(c.status === "Available" || c.status === "Reserved") && (
                                <DropdownMenuItem onSelect={() => setConfirm({ car: c, kind: "sold" })}><BadgeCheck className="me-2 size-4" />فروخته شد</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirm({ car: c, kind: "delete" })}>
                                <Trash2 className="me-2 size-4" />حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data.items.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">خودرویی پیدا نشد.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {data.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</Button>
              <span className="text-sm text-muted-foreground">صفحه‌ی {fa(page)} از {fa(data.totalPages)}</span>
              <Button variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === "delete" ? `حذف «${confirm.car.titleFa}»؟` : `«${confirm?.car.titleFa}» فروخته شد؟`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "delete"
                ? "خودرو از سایت و پنل حذف می‌شود (سابقه‌اش در لاگ می‌ماند). خودروی رزروشده حذف نمی‌شود."
                : "خودرو از فروش خارج می‌شود و رزرو فعالش (اگر باشد) به خرید تبدیل می‌شود. این کار برگشت ندارد."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doConfirm()} className={confirm?.kind === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
              {confirm?.kind === "delete" ? "حذف" : "ثبت فروش"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

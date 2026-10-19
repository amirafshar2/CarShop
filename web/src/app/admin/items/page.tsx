"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImageOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminHeader, LoadState, StatusPill } from "@/components/app/admin-page";
import { apiSend, isAdmin, mediaUrl, type Listing } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import { useAdminSite } from "@/lib/admin-site";
import { listingStatusColor, listingStatusLabels } from "@/lib/labels";
import { priceText } from "@/lib/site";
import { fa } from "@/lib/format";

export default function AdminItemsPage() {
  const { user } = useSession();
  const canEdit = isAdmin(user);
  const { site } = useAdminSite();
  const L = site?.content.labels;
  const { data, error, loading, reload } = useApi<Listing[]>("/api/v1/admin/listings");
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<Listing | null>(null);
  const rows = useMemo(() => (data ?? []).filter((l) => !q || l.title.includes(q) || (l.category ?? "").includes(q)), [data, q]);

  const remove = async () => {
    if (!deleting) return;
    try {
      await apiSend(`/api/v1/admin/listings/${deleting.id}`, "DELETE");
      toast.success("حذف شد.");
      setDeleting(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <AdminHeader title={L?.itemPlural ?? "آیتم‌ها"} description={data ? `${fa(data.length)} مورد` : undefined}
        actions={<>
          <Button asChild variant="outline"><a href="/items" target="_blank" rel="noopener noreferrer">مشاهده در سایت</a></Button>
          <Button asChild><Link href="/admin/items/new"><Plus className="size-4" />{`افزودن ${L?.itemSingular ?? "آیتم"}`}</Link></Button>
        </>} />
      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute start-3 top-3 size-5 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو" className="h-11 ps-10" aria-label="جستجو" />
      </div>
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">{q ? "چیزی پیدا نشد." : `هنوز ${L?.itemSingular ?? "آیتم"}ی اضافه نکرده‌اید.`}</p>
          {!q && <Button asChild className="mt-4"><Link href="/admin/items/new"><Plus className="size-4" />{`اولین ${L?.itemSingular ?? "آیتم"}`}</Link></Button>}
        </div>
      )}
      <ul className="grid gap-3">
        {rows.map((l) => (
          <li key={l.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.images[0] ? <img src={mediaUrl(l.images[0])} alt="" className="h-full w-full object-cover" /> : <ImageOff className="size-5 text-muted-foreground" aria-hidden />}
              </div>
              <div className="min-w-0">
                <Link href={`/admin/items/${l.id}`} className="block truncate font-bold hover:text-primary">{l.title}</Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <StatusPill className={listingStatusColor[l.status]}>{listingStatusLabels[l.status]}</StatusPill>
                  {l.isFeatured && <StatusPill className="border-primary/40 bg-primary/10 text-primary">ویژه</StatusPill>}
                  {l.category && <span>{l.category}</span>}
                  <span className="font-semibold text-foreground">{priceText(l)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 self-end sm:self-auto">
              <Button asChild variant="outline" size="sm"><Link href={`/admin/items/${l.id}`}><Pencil className="size-4" />ویرایش</Link></Button>
              {canEdit && <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleting(l)} aria-label={`حذف ${l.title}`}><Trash2 className="size-4" /></Button>}
            </div>
          </li>
        ))}
      </ul>
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف «{deleting?.title}»؟</AlertDialogTitle>
            <AlertDialogDescription>از سایت حذف می‌شود. اگر فقط موقتاً نمی‌خواهید دیده شود، وضعیتش را «پنهان» کنید.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

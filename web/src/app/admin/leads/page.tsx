"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Phone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminHeader, LoadState, StatusPill } from "@/components/app/admin-page";
import { apiSend, type Lead, type LeadStatus, type LeadType, type Paged } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fa } from "@/lib/format";
import { faDate, leadStatusColor, leadStatusLabels, leadTypeLabels } from "@/lib/labels";

const wa = (phone: string) => `https://wa.me/98${phone.replace(/^0/, "")}`;

export default function AdminLeadsPage() {
  const { data, error, loading, reload, setData } = useApi<Paged<Lead>>("/api/v1/leads?pageSize=100");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [type, setType] = useState<LeadType | "all">("all");

  const rows = useMemo(
    () => (data?.items ?? []).filter((l) => (status === "all" || l.status === status) && (type === "all" || l.type === type)),
    [data, status, type],
  );

  const change = async (lead: Lead, next: LeadStatus) => {
    try {
      await apiSend(`/api/v1/leads/${lead.id}/status`, "PATCH", { status: next });
      setData((d) => (d ? { ...d, items: d.items.map((l) => (l.id === lead.id ? { ...l, status: next } : l)) } : d));
      toast.success(`وضعیت «${lead.name}» شد: ${leadStatusLabels[next]}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <AdminHeader
        title="درخواست‌های مشتری"
        description={data ? `${fa(data.totalCount)} درخواست — ${fa(data.items.filter((l) => l.status === "New").length)} جدید` : "فرم‌های تماس، رزرو بازدید، فروش خودرو، دیتیلینگ و ..."}
        actions={<Button variant="outline" onClick={() => void reload()}>به‌روزرسانی</Button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:w-[34rem]">
        <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus | "all")}>
          <SelectTrigger aria-label="فیلتر وضعیت"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه‌ی وضعیت‌ها</SelectItem>
            {(Object.keys(leadStatusLabels) as LeadStatus[]).map((s) => <SelectItem key={s} value={s}>{leadStatusLabels[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => setType(v as LeadType | "all")}>
          <SelectTrigger aria-label="فیلتر نوع"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه‌ی انواع</SelectItem>
            {(Object.keys(leadTypeLabels) as LeadType[]).map((t) => <SelectItem key={t} value={t}>{leadTypeLabels[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>مشتری</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead className="min-w-56">پیام</TableHead>
                <TableHead>زمان</TableHead>
                <TableHead className="min-w-44">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-semibold">{l.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <a href={`tel:${l.phone}`} dir="ltr" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><Phone className="size-3.5" />{l.phone}</a>
                      <a href={wa(l.phone)} target="_blank" rel="noopener noreferrer" aria-label={`واتس‌اپ ${l.name}`} className="text-muted-foreground hover:text-emerald-400"><MessageCircle className="size-4" /></a>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{leadTypeLabels[l.type]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.message || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{faDate(l.createdAt)}</TableCell>
                  <TableCell>
                    <Select value={l.status} onValueChange={(v) => void change(l, v as LeadStatus)}>
                      <SelectTrigger aria-label={`وضعیت ${l.name}`} className="h-10 text-sm">
                        <StatusPill className={leadStatusColor[l.status]}>{leadStatusLabels[l.status]}</StatusPill>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(leadStatusLabels) as LeadStatus[]).map((s) => <SelectItem key={s} value={s}>{leadStatusLabels[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">درخواستی با این فیلتر وجود ندارد.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

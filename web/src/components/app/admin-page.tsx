import { Skeleton } from "@/components/ui/skeleton";

/** Page heading used by every admin screen. */
export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function LoadState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry?: () => void }) {
  if (error)
    return (
      <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
        {error}{" "}
        {onRetry && (
          <button type="button" onClick={onRetry} className="font-semibold text-primary underline-offset-4 hover:underline">
            تلاش دوباره
          </button>
        )}
      </div>
    );
  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  return null;
}

export function StatusPill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

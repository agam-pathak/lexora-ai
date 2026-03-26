import { Skeleton, StatsCardSkeleton } from "@/components/ui/Skeleton";
import { ArrowLeft } from "lucide-react";

export default function ProfileLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* ── Sub-Header ── */}
      <div className="relative z-40 shrink-0 border-b border-white/[0.06] bg-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <div>
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-1 h-3 w-16" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
          
          {/* ── User Overview Banner Skeleton ── */}
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-950/40 p-8">
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                   <Skeleton className="h-24 w-24 rounded-2xl" />
                   <div className="space-y-3">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                   </div>
                </div>
                <Skeleton className="h-10 w-28 rounded-xl" />
             </div>
          </div>

          <Skeleton className="h-3 w-40" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
             <StatsCardSkeleton />
             <StatsCardSkeleton />
             <StatsCardSkeleton />
             <StatsCardSkeleton />
          </div>

          <div className="max-w-xl">
             <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

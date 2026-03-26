"use client";

import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

/** Reusable shimmer-animated skeleton placeholder. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-white/[0.06]",
        className,
      )}
    />
  );
}

/* ── Pre-built composite skeletons ─────────────────────────── */

/** Three staggered text lines mimicking a chat message. */
export function MessageSkeleton() {
  return (
    <div className="space-y-3 py-2">
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

/** A horizontal card skeleton for thread history chips. */
export function ThreadChipSkeleton() {
  return (
    <div className="flex gap-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[56px] w-[160px] shrink-0 rounded-lg" />
      ))}
    </div>
  );
}

/** Full-chat loading state with multiple message skeletons. */
export function ChatLoadingSkeleton() {
  return (
    <div className="space-y-6 px-4 py-6">
      {/* Assistant intro */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {/* User message */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-48 rounded-2xl rounded-br-md" />
      </div>
      {/* Assistant reply */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** PDF viewer placeholder while document loads. */
export function PDFViewerSkeleton() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <Skeleton className="h-[480px] w-[340px] rounded-2xl" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

/** Profile stats card skeleton. */
export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-12 rounded-md" />
      </div>
      <Skeleton className="h-8 w-16 rounded-md" />
      <Skeleton className="mt-2 h-3 w-32 rounded-md" />
      <Skeleton className="mt-3 h-2 w-40 rounded-md" />
    </div>
  );
}

/** Workspace full-page loading skeleton. */
export function WorkspaceLoadingSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <div className="space-y-2">
          <Skeleton className="mx-auto h-3 w-32" />
          <Skeleton className="mx-auto h-2 w-24" />
        </div>
      </div>
    </div>
  );
}

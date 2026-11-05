import { Skeleton } from '@/shared/components/ui/skeleton'

/** Khớp hình thẻ mới: checkbox · QR 90×90 · hai dòng · hàng metadata. */
export const ArtifactCardSkeleton = () => (
  <div className="flex w-full items-center gap-2 rounded-[8px] border border-slate-300 bg-card p-3 md:py-4 md:pl-2 md:pr-4">
    <Skeleton className="size-4 shrink-0 rounded md:mx-2" />
    <Skeleton className="hidden h-[90px] w-[90px] shrink-0 rounded-[15px] md:block" />
    <div className="flex min-w-0 flex-1 flex-col gap-2 md:px-2">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-44 rounded" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-56 rounded" />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Skeleton className="hidden h-6 w-14 rounded-[6px] md:block" />
          <Skeleton className="size-8 rounded-[6px]" />
          <Skeleton className="size-8 rounded-[6px]" />
        </div>
      </div>
      <div className="hidden items-center gap-3 md:flex">
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="h-3.5 w-20 rounded" />
        <div className="flex-1" />
        <Skeleton className="h-3.5 w-28 rounded" />
      </div>
    </div>
  </div>
)

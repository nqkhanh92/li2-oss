import { Skeleton } from '@/shared/components/ui/skeleton'

export const ShortLinkCardSkeleton = () => (
  <div className="flex items-center gap-2 bg-card border border-slate-200 rounded-[8px] p-3 md:pl-2 md:pr-4 md:py-4 w-full">
    {/* Checkbox */}
    <div className="flex items-center justify-center px-1 md:px-2 shrink-0">
      <Skeleton className="size-4 rounded-sm" />
    </div>

    {/* QR preview — desktop only */}
    <Skeleton className="hidden md:block shrink-0 w-[90px] h-[90px] rounded-[15px]" />

    {/* Content */}
    <div className="flex flex-1 flex-col gap-2 min-w-0 md:px-2">
      {/* Top row: URL + actions */}
      <div className="flex gap-2 items-center">
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          {/* Short URL row */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="size-7 rounded-full shrink-0" />
            <Skeleton className="size-7 rounded-full shrink-0" />
          </div>
          {/* Destination URL row */}
          <div className="flex items-center gap-1">
            <Skeleton className="size-4 shrink-0 rounded" />
            <Skeleton className="h-3.5 w-64 rounded" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Stats bar — desktop only */}
          <Skeleton className="hidden md:block h-8 w-40 rounded-[6px]" />
          {/* Analytics button — desktop only */}
          <Skeleton className="hidden md:block size-9 rounded-[6px]" />
          {/* More options button */}
          <Skeleton className="size-9 rounded-[6px]" />
        </div>
      </div>

      {/* Metadata row — desktop only */}
      <div className="hidden md:flex items-center gap-4">
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
      </div>
    </div>
  </div>
)

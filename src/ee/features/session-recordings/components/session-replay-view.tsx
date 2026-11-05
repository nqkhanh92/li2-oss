'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { VideoOff } from 'lucide-react'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useGetSessionReplay } from '../hooks/queries'
import { SessionReplayHeader } from './session-replay-header'
import type { eventWithTime } from 'rrweb/typings/types'

const SessionReplayPlayer = dynamic(
  () => import('./session-replay-player').then((m) => ({ default: m.SessionReplayPlayer })),
  { ssr: false }
)

async function fetchAndDecompress(url: string): Promise<unknown[]> {
  const res = await fetch(url)
  if (!res.ok || !res.body) return []
  const ds = new DecompressionStream('gzip')
  const text = await new Response(res.body.pipeThrough(ds)).text()
  return JSON.parse(text) as unknown[]
}

export function SessionReplayView() {
  const { org_id, session_id } = useParams<{ org_id: string; session_id: string }>()
  const { data, isLoading, isError } = useGetSessionReplay(org_id, session_id)
  const [events, setEvents] = useState<eventWithTime[] | null>(null)
  const [fetchingChunks, setFetchingChunks] = useState(false)

  useEffect(() => {
    if (!data?.chunkUrls?.length) return
    setFetchingChunks(true)
    Promise.all(data.chunkUrls.map(fetchAndDecompress))
      .then((arrays) => setEvents(arrays.flat() as eventWithTime[]))
      .finally(() => setFetchingChunks(false))
  }, [data?.chunkUrls])

  if (isLoading || fetchingChunks) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          {/* Primary row */}
          <div className="px-4 py-3 border-b flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-2.5 w-28" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
          </div>
          {/* Secondary row */}
          <div className="px-4 py-2 bg-muted/30 flex flex-wrap items-center gap-x-6 gap-y-2 border-b">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Player skeleton */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="flex-1 min-w-0 w-full rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
              <div className="flex gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
              </div>
              <Skeleton className="flex-1 h-6 rounded-lg" />
            </div>
            {/* Video area */}
            <Skeleton className="w-full aspect-video rounded-none" />
            {/* Controls */}
            <div className="p-4 space-y-4 border-t">
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="flex-1 h-1.5 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline sidebar */}
          <div className="w-full lg:w-64 shrink-0 rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: '14rem' }}>
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex-1 divide-y divide-border/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-72 rounded-xl border bg-card text-muted-foreground">
        <VideoOff className="w-6 h-6 opacity-40" />
        <p className="text-sm">Failed to load recording.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.session && (
        <SessionReplayHeader session={data.session} ip={data.ip} />
      )}

      {!events || events.length < 2 ? (
        <div className="flex flex-col items-center justify-center gap-4 h-72 rounded-xl border bg-card text-muted-foreground">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted/60">
            <VideoOff className="w-6 h-6 opacity-60" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground/70">No recording available</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              This session did not capture enough data to replay.
            </p>
          </div>
        </div>
      ) : (
        <SessionReplayPlayer events={events} />
      )}
    </div>
  )
}

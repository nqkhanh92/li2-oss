'use client'

import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

export const TopPerformanceDate = ({
  isLoading,
  topPerformingDate,
}: {
  isLoading?: boolean
  topPerformingDate?: {
    date: string
    total: number
  }
}) => {
  return (
    <div className="text-muted-foreground text-sm">
      <Tabs defaultValue="os" className="space-y-2">
        <TabsList className="bg-transparent border-none outline-hidden gap-2 p-0">
          <TabsTrigger
            value="os"
            className="px-0 py-0 rounded-none border-black outline-hidden data-[state=active]:border-b data-[state=active]:outline-hidden data-[state=active]:shadow-none"
          >
            OS
          </TabsTrigger>
          <TabsTrigger
            value="platform"
            className="px-0 py-0 rounded-none border-black outline-hidden data-[state=active]:border-b data-[state=active]:outline-hidden data-[state=active]:shadow-none"
          >
            Platform
          </TabsTrigger>
          <TabsTrigger
            value="type"
            className="px-0 py-0 rounded-none border-black outline-hidden data-[state=active]:border-b data-[state=active]:outline-hidden data-[state=active]:shadow-none"
          >
            Type
          </TabsTrigger>
        </TabsList>
        <TabsContent value="os" className="">
          <div>
            {isLoading ? (
              <Skeleton className="w-full h-6" />
            ) : (
              <div className="flex flex-row gap-2 w-full">
                <span className="text-5xl font-bold text-primary">{topPerformingDate?.total}</span>
                <div className="flex flex-col justify-center">
                  <p className="text-xl font-bold text-primary">Clicks + scans</p>
                  <p>{topPerformingDate?.date}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="platform">
          <div>
            {isLoading ? (
              <Skeleton className="w-full h-6" />
            ) : (
              <div className="flex flex-row gap-2 w-full">
                <span className="text-5xl font-bold text-primary">{topPerformingDate?.total}</span>
                <div>
                  <p className="text-xl font-bold text-primary">Clicks + scans</p>
                  <p>{topPerformingDate?.date}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="type">
          <div>
            {isLoading ? (
              <Skeleton className="w-full h-6" />
            ) : (
              <div className="flex flex-row gap-2 w-full">
                <span className="text-5xl font-bold text-primary">{topPerformingDate?.total}</span>
                <div>
                  <p className="text-xl font-bold text-primary">Clicks + scans</p>
                  <p>{topPerformingDate?.date}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

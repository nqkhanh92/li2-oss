import { DashboardDataType } from '@/app/api/organizations/[org_id]/dashboard/route'
import { cn } from '@/shared/lib/cn'
import Image from 'next/image'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useState } from 'react'

export const DashboardSetupListPoint = ({
  data,
}: {
  data: DashboardDataType['performanceOverTime']
}) => {
  const listPoint: { name: string; value: number; requirements: number }[] = [
    {
      name: 'Create first campaign',
      value: 0,
      requirements: 1,
    },
    {
      name: 'Create first touch point',
      value: 0,
      requirements: 1,
    },
    {
      name: 'Create first tag',
      value: 0,
      requirements: 1,
    },
    {
      name: 'Activate 3 Asset NFC',
      value: 3,
      requirements: 3,
    },
    {
      name: 'Create 3 campaign',
      value: 0,
      requirements: 3,
    },
  ]
  const [showAll, setShowAll] = useState(false)
  const visibleItems = showAll ? listPoint : listPoint.slice(0, 3)
  return (
    <div className="flex flex-col gap-2 self-stretch items-start">
      <div className="flex items-start self-stretch flex-col">
        <span className="text-lg leading-[28px] font-medium">Set yourself up for success</span>
        <span className="text-sm leading-[20px]">
          You've completed {listPoint.filter((item) => item.value >= item.requirements).length} of{' '}
          {listPoint.length} steps
        </span>
      </div>
      <div
        className={cn(
          'flex p-6 flex-col items-start gap-2 self-stretch rounded-[16px] bg-background relative'
        )}
      >
        {visibleItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Image
              src={'/images/CHECK_violet.svg'}
              alt={'check'}
              width={28}
              height={28}
              className="aspect-square"
            />
            <span className="text-base leading-[24px]">{item.name}</span>
          </div>
        ))}
        {listPoint.length > 3 && (
          <div
            className="absolute right-7 top-1/2 -translate-y-1/2 cursor-pointer text-guest-primary-default"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? <ChevronUpIcon size={28} /> : <ChevronDownIcon size={28} />}
          </div>
        )}
      </div>
    </div>
  )
}

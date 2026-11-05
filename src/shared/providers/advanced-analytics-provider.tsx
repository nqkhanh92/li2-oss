import { filterOptions, timePeriods } from '@/features/advanced-analytics/constants'
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useOrganizationStoreProvider } from './organization-store-provider'
import { useGetTouchPointDropdown } from '@/features/touch-points/hooks/queries'
import { useParams } from 'next/navigation'
import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'
import { GetTouchPointObject } from '@/app/api/organizations/[org_id]/touch-points/route'
export type FilterByType = 'tags' | 'touchpoints'
interface FilterAdvancedAnalyticProps {
  allowExtraAdvancedAnalytic?: boolean
  options?: { value: string; label: string }[]

  filterBy?: FilterByType
  setFilterBy?: (value: FilterByType) => void

  timePeriod: number
  setTimePeriod: (value: number) => void

  selectedTags: string[]
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>

  selectedTouchpoints: string[]
  setSelectedTouchpoints: React.Dispatch<React.SetStateAction<string[]>>

  handleTagToggle?: (tagId: string) => any
  handleTouchpointToggle?: (touchpointId: string) => any

  timePeriods?: { value: number; label: string; premium?: boolean }[]
  handleTimePeriodChange?: (timePeriod: number, isPremium: boolean) => void

  handleMasterReset?: () => void

  allTouchpoints?: DropdownData<'touch_points'>
  allTags?: DropdownData<'tags'>
  availableTouchpoints?: DropdownData<'touch_points'>

  // NEW: Space filtering support
  spaceId?: string // For space-specific analytics
  selectedSpaceIds?: string[] // For org analytics with space filter
  setSelectedSpaceIds?: React.Dispatch<React.SetStateAction<string[]>>
}
const defaultFilters: Partial<FilterAdvancedAnalyticProps> = {
  timePeriods: timePeriods,
  options: filterOptions,
}

export const useAdvancedAnalyticsProvider = (): FilterAdvancedAnalyticProps => {
  const ctx = React.useContext(AdvancedAnalyticsContext)
  if (!ctx) throw Error(`Lack of provider`)
  return ctx
}

const AdvancedAnalyticsContext = createContext<FilterAdvancedAnalyticProps | null>(null)

interface AdvancedAnalyticsProviderProps extends PropsWithChildren {
  spaceId?: string // NEW: Pass from space analytics page
}

export const AdvancedAnalyticsProvider = ({ children, spaceId }: AdvancedAnalyticsProviderProps) => {
  const { orgPlan } = useOrganizationStoreProvider()
  const { org_id } = useParams<{ org_id: string }>()

  const { data: allTouchpoints } = useGetTouchPointDropdown(org_id)

  const { data: allTags } = useGetTagDropdowns(org_id)

  const [filterBy, setFilterBy] = useState<FilterByType>('tags')
  const [timePeriod, setTimePeriod] = useState<number>(7)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedTouchpoints, setSelectedTouchpoints] = useState<string[]>([])
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]) // NEW: Space filter state
  const allowExtraAdvancedAnalytic = useMemo(() => orgPlan?.extra_advanced_analytics, [orgPlan])

  const handleMasterReset = () => {
    setSelectedTags([])
    setSelectedTouchpoints([])
    setSelectedSpaceIds([]) // NEW: Reset space filter
    setTimePeriod(7)
  }
  // useEffect(() => {
  //   setSelectedTags([])
  //   setSelectedTouchpoints([])
  // }, [filterBy])

  const availableTouchpoints = useMemo(() => {
    if (selectedTags?.length === 0 || selectedTags?.length === undefined) {
      return allTouchpoints
    }
    return allTouchpoints?.filter((touchpoint: any) =>
      touchpoint.tp_tag_links?.some(
        (tag: any) => Array.isArray(selectedTags) && selectedTags?.includes(tag.tag_id)
      )
    )
  }, [selectedTags, allTouchpoints])

  useEffect(() => {
    setSelectedTouchpoints((pre) =>
      pre.filter((tpId) => availableTouchpoints?.some((tp) => tp.id === tpId))
    )
  }, [availableTouchpoints])

  const handleTagToggle = useCallback(
    (tagId: string) => {
      const selectedArray = Array.isArray(selectedTags) ? selectedTags : []

      const newSelectedTags = selectedArray.includes(tagId)
        ? selectedArray.filter((id: string) => id !== tagId)
        : [...selectedArray, tagId]

      setSelectedTags(newSelectedTags)

      // Clear touchpoints that are no longer available
      const availableTouchpoints = allTouchpoints?.filter(
        (touchpoint) =>
          newSelectedTags.length === 0 ||
          touchpoint.tp_tag_links?.some((tag) => newSelectedTags.includes(tag.tag_id))
      )
      const availableTouchpointIds = availableTouchpoints?.map((tp) => tp.id)

      setSelectedTouchpoints((prev) =>
        Array.isArray(prev) ? prev.filter((id: string) => availableTouchpointIds?.includes(id)) : []
      )
    },
    [selectedTags, allTouchpoints]
  )

  const handleTouchpointToggle = (touchpointId: string) => {
    setSelectedTouchpoints((prev) => prev.filter((id: string) => id !== touchpointId))
  }

  const handleTimePeriodChange = (value: number, isPremiumPeriod: boolean) => {
    if (!isPremiumPeriod || allowExtraAdvancedAnalytic) {
      setTimePeriod(value)
    }
  }

  const filters = {
    ...defaultFilters,
    allTouchpoints,
    allTags,
    availableTouchpoints,

    allowExtraAdvancedAnalytic,
    filterBy,
    timePeriod,
    selectedTags,
    selectedTouchpoints,
    setFilterBy,
    setTimePeriod,
    setSelectedTags,
    setSelectedTouchpoints,
    handleMasterReset,
    handleTagToggle,
    handleTouchpointToggle,
    handleTimePeriodChange,

    // NEW: Space filtering
    spaceId,
    selectedSpaceIds,
    setSelectedSpaceIds,
  }

  return (
    <AdvancedAnalyticsContext.Provider value={filters}>
      {children}
    </AdvancedAnalyticsContext.Provider>
  )
}

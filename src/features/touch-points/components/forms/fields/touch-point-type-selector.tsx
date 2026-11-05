import { AnimatedTabs, AnimatedTab } from '@/shared/components/animation/animated-tabs'
import { AllTouchPointVariants } from '@/features/touch-points/types'

interface TouchPointTypeSelectorProps {
  tabs: AnimatedTab[]
  selectedTab: AllTouchPointVariants
  onTabChange: (tab: AllTouchPointVariants) => void
}

/**
 * Touch point type selector (Link/QR Code tabs)
 */
export const TouchPointTypeSelector = ({
  tabs,
  selectedTab,
  onTabChange,
}: TouchPointTypeSelectorProps) => {
  return (
    <AnimatedTabs
      className="[&_button]:py-2 [&_button]:pr-4"
      tabs={tabs}
      value={selectedTab}
      onValueChange={(value) => onTabChange(value as AllTouchPointVariants)}
    />
  )
}

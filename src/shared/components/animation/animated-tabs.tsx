import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { motion } from 'framer-motion'

export type AnimatedTab = {
  id: string
  label: string | React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  content?: React.ReactNode
  disabled?: boolean
}

export type AnimatedTabsProps = {
  tabs: AnimatedTab[]
  value: string
  onValueChange: (value: string) => void
  className?: string
  children?: React.ReactNode
}

export const AnimatedTabs = ({
  tabs,
  value,
  onValueChange,
  className,
  children,
}: AnimatedTabsProps) => {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList className="bg-transparent border-none">
        {tabs.map((tab) => (
          <TabsTrigger
            variant="outline"
            key={tab.id}
            value={tab.id}
            className="relative border-transparent! group"
          >
            {tab.label}
            {value === tab.id && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}

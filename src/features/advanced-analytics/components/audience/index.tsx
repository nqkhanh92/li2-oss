import React, { Suspense, useState } from 'react'
// Interaction Frequency Sub-component
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import GeographicDistribution from './geographic-distribution'
import DeviceAnalytic from './device-analytic'
import { Globe, Smartphone } from 'lucide-react'
type Section = {
  id: keyof typeof mappingSectionIdToComponent
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const mappingSectionIdToComponent = {
  'geographic-analysis': React.lazy(() => import('./geographic-distribution')),
  'device-platform': React.lazy(() => import('./device-analytic')),
}
interface AudiencesTabProps {
  collectionIds?: string[]
}

const AudiencesTab = ({ collectionIds }: AudiencesTabProps) => {
  const sections: Section[] = [
    {
      id: 'geographic-analysis',
      label: 'Geographic Analysis',
      icon: Globe,
      description: 'Global audience distribution and insights',
    },
    {
      id: 'device-platform',
      label: 'Device & Platform',
      icon: Smartphone,
      description: 'Technology preferences and usage patterns',
    },
  ]
  const [activeSection, setActiveSection] =
    useState<keyof typeof mappingSectionIdToComponent>('geographic-analysis')
  const Component = mappingSectionIdToComponent[activeSection]
  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="rounded-2xl w-full flex flex-col gap-6">
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="grid grid-cols-2">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <Button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`h-auto flex-1 px-6 py-4 text-left relative transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-500 hover:bg-purple-100 hover:text-purple-600'
                      : 'bg-transparent text-gray-600 hover:bg-purple-100 hover:text-gray-900'
                  }`}
                  iconLeft={
                    <Icon
                      className={`
                    mr-2 transition-colors
                    ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                `}
                    />
                  }
                >
                  <div className="text-left">
                    <div>{section.label}</div>
                    <div className="text-xs text-gray-500 font-normal">{section.description}</div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
        {/* Sub-Tab Content */}
        <div className="min-h-[600px]">
          <Suspense fallback={<Skeleton className="w-full h-[600px]" />}>
            <Component />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default AudiencesTab

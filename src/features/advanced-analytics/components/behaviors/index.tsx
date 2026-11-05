import React, { Suspense, useState } from 'react'
import { Clock, Users, Calendar } from 'lucide-react'
// Interaction Frequency Sub-component
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import InteractionFrequencySection from './behaviors-subtabs/interaction-frequency-section'
import UserJourneysSection from './behaviors-subtabs/user-journeys-section'
import TemporalBehaviorSection from './behaviors-subtabs/temporal-behavior-section'
import { useTranslation } from 'react-i18next'
type Section = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  component: React.ReactNode
}

interface BehaviorSectionProps {
  collectionIds?: string[]
}

const BehaviorSection = ({ collectionIds }: BehaviorSectionProps) => {
  const { t } = useTranslation('advanced_analytics')
  const [activeSection, setActiveSection] = useState('interaction-frequency')
  const sections: Section[] = [
    {
      id: 'interaction-frequency',
      label: t('behaviors.index.interaction_frequency_label'),
      icon: Clock,
      description: t('behaviors.index.interaction_frequency_desc'),
      component: <InteractionFrequencySection />,
    },
    {
      id: 'user-journeys',
      label: t('behaviors.index.user_journeys_label'),
      icon: Users,
      description: t('behaviors.index.user_journeys_desc'),
      component: <UserJourneysSection />,
    },
    {
      id: 'temporal-behavior',
      label: t('behaviors.index.temporal_behavior_label'),
      icon: Calendar,
      description: t('behaviors.index.temporal_behavior_desc'),
      component: <TemporalBehaviorSection />,
    },
  ]
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'interaction-frequency':
        return <InteractionFrequencySection />
      case 'user-journeys':
        return <UserJourneysSection />
      case 'temporal-behavior':
        return <TemporalBehaviorSection />
      default:
        return <InteractionFrequencySection />
    }
  }
  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="rounded-2xl w-full flex flex-col gap-6">
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="grid grid-cols-3">
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
                >
                  <Icon
                    className={`
                                      w-5 h-5 mr-2 transition-colors
                                      ${
                                        isActive
                                          ? 'text-blue-500'
                                          : 'text-gray-400 group-hover:text-gray-500'
                                      }
                                  `}
                  />
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
            {renderSectionContent()}
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default BehaviorSection

import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { Crown } from 'lucide-react'

export type NavBarAdavanedAnalyticProps = {
  tabs: {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    premium: boolean
    disabled?: boolean
  }[]
  activeTab: string
  setActiveTab: (tab: string) => void
  setTab: (tab: string) => void
}
export const NavBarAdavanedAnalytic = ({
  tabs,
  activeTab,
  setActiveTab,
  setTab,
}: NavBarAdavanedAnalyticProps) => {
  const { orgPlan } = useOrganizationStoreProvider()

  const allowExtraAdvancedAnalytic = orgPlan?.extra_advanced_analytics

  return (
    <nav className="flex flex-row gap-6" aria-label="Tabs">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        const isDisabled = tab.disabled || (tab.premium && !allowExtraAdvancedAnalytic)
        const canAccess = !tab.premium || allowExtraAdvancedAnalytic

        return (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setTab(tab.id)
            }}
            className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200
                          ${
                            isActive && canAccess
                              ? 'border-blue-500 text-blue-600'
                              : canAccess
                              ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              : 'border-transparent text-gray-400 cursor-not-allowed'
                          }
                        `}
            disabled={isDisabled}
          >
            <Icon
              className={`
                          w-5 h-5 mr-2 transition-colors
                          ${
                            isActive && canAccess
                              ? 'text-blue-500'
                              : canAccess
                              ? 'text-gray-400 group-hover:text-gray-500'
                              : 'text-gray-300'
                          }
                        `}
            />
            {tab.label}
            {/* {tab.premium && (
              <Crown
                className={`
                            w-4 h-4 ml-2
                            ${allowExtraAdvancedAnalytic ? 'text-purple-500' : 'text-gray-400'}
                          `}
              />
            )} */}
            {tab.disabled && <span className="ml-2 text-xs text-gray-400">(Coming soon)</span>}
            {!canAccess && (
              <Crown
                className={`
                            w-4 h-4 ml-2 text-purple-500
                          `}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}

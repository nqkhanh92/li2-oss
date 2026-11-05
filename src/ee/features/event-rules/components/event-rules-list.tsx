'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Plus, Zap } from 'lucide-react'
import { useGetEventRules } from '../hooks/queries'
import { useDeleteEventRule, useToggleEventRule } from '../hooks/mutations'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { EventRuleCard } from './event-rule-card'
import { Button } from '@/shared/components/ui/button'
import { CreateEventRuleDialog } from './create-event-rule-dialog'
import { SmartSetupTrigger } from '@/features/smart-setup/components/smart-setup-trigger'
import { SmartSetupResults } from '@/features/smart-setup/components/smart-setup-results'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { FeatureUpgradeSection } from '@/shared/components/customize/feature-upgrade-section'
import { cn } from '@/shared/lib/utils'
import type { EventRuleTriggerType } from '../types'

type FilterTab = 'all' | EventRuleTriggerType

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'click', label: 'Click' },
  { key: 'form_submit', label: 'Form Submit' },
  { key: 'form_fill', label: 'Form Filled' },
  { key: 'element_visibility', label: 'Element Visibility' },
]

export const EventRulesList = ({ blocked = false }: { blocked?: boolean }) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t, i18n } = useTranslation('event-rules')
  const { t: tSetup } = useTranslation('smart_setup')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [smartSetupOpen, setSmartSetupOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const { data, isLoading, isError } = useGetEventRules(org_id)
  const { mutateAsync: deleteRule } = useDeleteEventRule(org_id)
  const { mutate: toggleRule } = useToggleEventRule(org_id)
  const { confirm } = useConfirmDialog()
  const { hasPermission } = useOrganizationStoreProvider()
  const canAdd = hasPermission(ROLE_PERMISSION_KEYS.ADD_EVENT_RULE)
  const canEdit = hasPermission(ROLE_PERMISSION_KEYS.EDIT_EVENT_RULE)
  const canDelete = hasPermission(ROLE_PERMISSION_KEYS.DELETE_EVENT_RULE)

  const allRules = data?.data ?? []
  const rules =
    activeFilter === 'all' ? allRules : allRules.filter((r) => r.trigger_type === activeFilter)

  if (blocked) {
    return (
      <FeatureUpgradeSection
        title={t('plan_upgrade.title')}
        description={t('plan_upgrade.description')}
      />
    )
  }

  const handleDelete = async (ruleId: string) => {
    const rule = allRules.find((r) => r.id === ruleId)
    confirm({
      title: t('list.deleteTitle'),
      description: t('list.deleteDesc', { name: rule?.name ?? 'this rule' }),
      confirmButtonText: t('list.delete'),
      cancelButtonText: t('list.cancel'),
      onConfirm: async () => {
        await deleteRule(ruleId)
      },
    })
  }

  const handleToggle = (ruleId: string, isActive: boolean) => {
    toggleRule({ ruleId, isActive })
  }

  const renderLoading = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border border-slate-200 rounded-lg p-2 flex flex-col gap-5 animate-pulse"
        >
          <div className="h-10 bg-slate-200 rounded-md" />
          <div className="flex flex-col gap-3 px-2 pb-1">
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="flex gap-1">
              <div className="h-5 w-20 bg-slate-200 rounded-sm" />
              <div className="h-5 w-28 bg-slate-200 rounded-sm" />
            </div>
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </div>
          <div className="border-t border-slate-100 pt-1 flex gap-1 px-1">
            <div className="flex-1 h-7 bg-slate-200 rounded" />
            <div className="w-7 h-7 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )

  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Zap className="w-12 h-12 text-red-400" />
      <div className="text-center">
        <h3 className="text-base font-medium text-foreground">{t('list.failedToLoad')}</h3>
        <p className="text-s text-slate-500 mt-1">{t('list.failedToLoadDesc')}</p>
      </div>
    </div>
  )

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Zap className="w-12 h-12 text-slate-400" />
      <div className="text-center">
        <h3 className="text-base font-medium text-foreground">{t('list.noRules')}</h3>
        <p className="text-s text-slate-500 mt-1">{t('list.noRulesDesc')}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Button className="gap-1.5" onClick={() => setCreateDialogOpen(true)} disabled={!canAdd}>
          <Plus className="w-4 h-4" />
          {t('list.createRule')}
        </Button>
        {canAdd && (
          <SmartSetupTrigger
            orgId={org_id}
            variant="event_rules"
            onClick={() => setSmartSetupOpen(true)}
          />
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Filter tabs + New Event Rule button */}
        <div className="flex items-end justify-between gap-4">
          {/* Tabs – scrollable on mobile */}
          <div className="flex items-end overflow-x-auto [&::-webkit-scrollbar]:hidden shrink-0 min-w-0">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    'flex items-center justify-center px-4 py-2 text-s! font-normal whitespace-nowrap transition-colors',
                    isActive ? 'text-primary border-b-[1.5px] border-slate-800' : 'text-slate-400'
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* New Event Rule button */}
          <Button
            className="gap-1.5 shrink-0"
            onClick={() => setCreateDialogOpen(true)}
            disabled={!canAdd}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('list.newRule')}</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          renderLoading()
        ) : isError ? (
          renderError()
        ) : allRules.length === 0 ? (
          renderEmpty()
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rules.map((rule) => (
              <EventRuleCard
                key={rule.id}
                rule={rule}
                orgId={org_id}
                onDelete={handleDelete}
                onToggle={handleToggle}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
            {rules.length === 0 && activeFilter !== 'all' && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3">
                <Zap className="w-10 h-10 text-slate-300" />
                <p className="text-s text-slate-500">
                  No {FILTER_TABS.find((t) => t.key === activeFilter)?.label.toLowerCase()} rules
                  yet
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateEventRuleDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <Sheet open={smartSetupOpen} onOpenChange={setSmartSetupOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{tSetup('title')}</SheetTitle>
          </SheetHeader>
          <SmartSetupResults
            orgId={org_id}
            locale={i18n.language as 'en' | 'vi'}
            onComplete={() => setSmartSetupOpen(false)}
            onSkip={() => setSmartSetupOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

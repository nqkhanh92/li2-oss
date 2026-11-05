'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Plus, Trash2, FileText } from 'lucide-react'
import { useUpdateDataCollectionRules } from '../hooks/mutations'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { DataCollectionRules } from '../hooks/queries'

interface Props {
  org_id: string
  rules: DataCollectionRules
}

type CollectionMode = 'exclude' | 'include'

export const DataCollectionRulesSection = ({ org_id, rules }: Props) => {
  const { t } = useTranslation('setting')
  const updateRulesMutation = useUpdateDataCollectionRules(org_id)

  const [mode, setMode] = useState<CollectionMode>('exclude')
  const [excludePaths, setExcludePaths] = useState<string[]>([])
  const [includePaths, setIncludePaths] = useState<string[]>([])
  const [newPath, setNewPath] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // Derive the active list from current mode
  const paths = mode === 'exclude' ? excludePaths : includePaths
  const setPaths = mode === 'exclude' ? setExcludePaths : setIncludePaths

  useEffect(() => {
    setMode(rules.mode ?? (rules.exclude_paths.length > 0 ? 'exclude' : rules.include_paths.length > 0 ? 'include' : 'exclude'))
    setExcludePaths(rules.exclude_paths)
    setIncludePaths(rules.include_paths)
    setHasChanges(false)
  }, [rules])

  const handleModeChange = (newMode: CollectionMode) => {
    setMode(newMode)
    setHasChanges(true)
  }

  const handleAddPath = () => {
    if (!newPath.trim()) return
    if (paths.includes(newPath.trim())) return
    setPaths([...paths, newPath.trim()])
    setNewPath('')
    setHasChanges(true)
  }

  const handleRemovePath = (pathToRemove: string) => {
    setPaths(paths.filter((p) => p !== pathToRemove))
    setHasChanges(true)
  }

  const handleSave = async () => {
    const rulesToSave =
      mode === 'exclude'
        ? { mode, exclude_paths: excludePaths, include_paths: [] }
        : { mode, exclude_paths: [], include_paths: includePaths }

    await updateRulesMutation.mutateAsync(rulesToSave)
    setHasChanges(false)
  }

  const handleReset = () => {
    setMode(rules.mode ?? (rules.exclude_paths.length > 0 ? 'exclude' : rules.include_paths.length > 0 ? 'include' : 'exclude'))
    setExcludePaths(rules.exclude_paths)
    setIncludePaths(rules.include_paths)
    setHasChanges(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        {t(
          'analytics_settings.data_collection_rules.description',
          'Control which pages on your website should be tracked. You can either exclude specific pages or include only specific pages.'
        )}
      </p>

      <Alert variant={'info'}>
        <AlertDescription>
          {t(
            'analytics_settings.data_collection_rules.help',
            'Use exact paths (/checkout) or regex patterns (^/admin/.*) to match multiple pages. Paths are case-sensitive.'
          )}
        </AlertDescription>
      </Alert>

      {/* Two-column layout: mode selector on the left, paths zone on the right */}
      <div className="flex gap-4 items-start">
        {/* Left: Collection Mode radio group */}
        <div className="flex flex-col gap-2 w-56 shrink-0">
          <Label className="text-sm font-medium">
            {t('analytics_settings.data_collection_rules.mode_label', 'Collection Mode')}
          </Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) => handleModeChange(value as CollectionMode)}
            className="flex flex-col gap-2"
          >
            <div
              className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors ${mode === 'exclude' ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleModeChange('exclude')}
            >
              <RadioGroupItem value="exclude" id="exclude" className="mt-0.5 shrink-0" />
              <Label htmlFor="exclude" className="cursor-pointer font-normal leading-none">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm">
                    {t('analytics_settings.data_collection_rules.exclude_mode', 'Exclude Pages')}
                  </span>
                  <span className="text-xs text-slate-500 leading-snug">
                    {t(
                      'analytics_settings.data_collection_rules.exclude_description',
                      'Track all pages except the ones listed'
                    )}
                  </span>
                </div>
              </Label>
            </div>

            <div
              className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors ${mode === 'include' ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleModeChange('include')}
            >
              <RadioGroupItem value="include" id="include" className="mt-0.5 shrink-0" />
              <Label htmlFor="include" className="cursor-pointer font-normal leading-none">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm">
                    {t('analytics_settings.data_collection_rules.include_mode', 'Include Pages Only')}
                  </span>
                  <span className="text-xs text-slate-500 leading-snug">
                    {t(
                      'analytics_settings.data_collection_rules.include_description',
                      'Track only the pages listed'
                    )}
                  </span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-slate-200 shrink-0" />

        {/* Right: Paths management zone */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <Label className="text-sm font-medium">
            {mode === 'exclude'
              ? t('analytics_settings.data_collection_rules.excluded_paths', 'Excluded Paths')
              : t('analytics_settings.data_collection_rules.included_paths', 'Included Paths')}
          </Label>

          {paths.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm">
                {mode === 'exclude'
                  ? t('analytics_settings.data_collection_rules.no_excluded', 'No excluded paths configured')
                  : t('analytics_settings.data_collection_rules.no_included', 'No included paths configured')}
              </p>
              <p className="text-xs mt-1">
                {mode === 'exclude'
                  ? t(
                      'analytics_settings.data_collection_rules.no_excluded_hint',
                      'All pages will be tracked'
                    )
                  : t(
                      'analytics_settings.data_collection_rules.no_included_hint',
                      'No pages will be tracked until you add some'
                    )}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {paths.map((path) => (
                <div key={path} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-mono text-sm truncate">{path}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-500"
                    onClick={() => handleRemovePath(path)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="/checkout or ^/admin/.*"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddPath()
                }
              }}
            />
            <Button onClick={handleAddPath} variant="outline" className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              {t('analytics_settings.data_collection_rules.add_path', 'Add')}
            </Button>
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p>
              <strong>/checkout</strong> -{' '}
              {t('analytics_settings.data_collection_rules.example_exact', 'Matches /checkout exactly')}
            </p>
            <p>
              <strong>^/admin/.*</strong> -{' '}
              {t(
                'analytics_settings.data_collection_rules.example_regex',
                'Matches all paths starting with /admin/'
              )}
            </p>
          </div>

          {hasChanges && (
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={updateRulesMutation.isPending}>
                {updateRulesMutation.isPending
                  ? t('common:buttons.loading', 'Loading...')
                  : t('common:buttons.save', 'Save Changes')}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={updateRulesMutation.isPending}>
                {t('common:buttons.cancel', 'Cancel')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

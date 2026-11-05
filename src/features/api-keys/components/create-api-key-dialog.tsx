'use client'

import { useState } from 'react'
import { Plus, Info, Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { ApiKeyType, CreateApiKeyRequest, ApiKeyWithSecret } from '@/shared/types/api-key'
import { RolePermissionKey, ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { ApiKeyCreatedDialog } from './api-key-created-dialog'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { cn } from '@/shared/lib/utils'
import { PermissionsSelector } from './permissions-selector'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Calendar as CalendarComponent } from '@/shared/components/ui/calendar'
import { format, addDays, addYears } from 'date-fns'
import dayjs from '@/shared/lib/dayjs'

interface CreateApiKeyDialogProps {
  onCreateApiKey: (request: CreateApiKeyRequest) => Promise<ApiKeyWithSecret>
  trigger?: React.ReactNode
}

type PermissionPreset = 'read-only' | 'standard' | 'full' | 'custom'

const PERMISSION_PRESETS = {
  'read-only': {
    name: 'Read-only Access',
    description: 'View-only permissions',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_DASHBOARD,
      ROLE_PERMISSION_KEYS.VIEW_ANALYTICS,
      ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS,
      ROLE_PERMISSION_KEYS.VIEW_TAGS,
      ROLE_PERMISSION_KEYS.VIEW_INTEGRATIONS,
      ROLE_PERMISSION_KEYS.VIEW_COLLECTIONS,
      ROLE_PERMISSION_KEYS.VIEW_UTM_TEMPLATES,
      ROLE_PERMISSION_KEYS.VIEW_ORGANIZATION,
      ROLE_PERMISSION_KEYS.VIEW_MEMBERS,
    ] as RolePermissionKey[],
    disabled: false,
  },
  standard: {
    name: 'Standard Access',
    description: 'Read and write permissions',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_DASHBOARD,
      ROLE_PERMISSION_KEYS.VIEW_ANALYTICS,
      ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS,
      ROLE_PERMISSION_KEYS.ADD_TOUCH_POINT,
      ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT,
      ROLE_PERMISSION_KEYS.DELETE_TOUCH_POINT,
      ROLE_PERMISSION_KEYS.VIEW_TAGS,
      ROLE_PERMISSION_KEYS.ADD_TAG,
      ROLE_PERMISSION_KEYS.EDIT_TAG,
      ROLE_PERMISSION_KEYS.DELETE_TAG,
      ROLE_PERMISSION_KEYS.VIEW_INTEGRATIONS,
      ROLE_PERMISSION_KEYS.ADD_INTEGRATION,
      ROLE_PERMISSION_KEYS.EDIT_INTEGRATION,
      ROLE_PERMISSION_KEYS.DELETE_INTEGRATION,
      ROLE_PERMISSION_KEYS.VIEW_COLLECTIONS,
      ROLE_PERMISSION_KEYS.ADD_COLLECTION,
      ROLE_PERMISSION_KEYS.EDIT_COLLECTION,
      ROLE_PERMISSION_KEYS.VIEW_UTM_TEMPLATES,
      ROLE_PERMISSION_KEYS.ADD_UTM_TEMPLATE,
      ROLE_PERMISSION_KEYS.EDIT_UTM_TEMPLATE,
      ROLE_PERMISSION_KEYS.VIEW_ORGANIZATION,
      ROLE_PERMISSION_KEYS.VIEW_MEMBERS,
    ] as RolePermissionKey[],
    disabled: false,
  },
  full: {
    name: 'Full Access',
    description: 'All permissions',
    permissions: Object.values(ROLE_PERMISSION_KEYS) as RolePermissionKey[],
    disabled: false,
  },
  custom: {
    name: 'Custom Access',
    description: 'Choose specific permissions',
    permissions: [] as RolePermissionKey[],
    disabled: true,
  },
}

type ExpirationPreset = '7days' | '30days' | '365days' | 'never' | 'custom'

export function CreateApiKeyDialog({ onCreateApiKey, trigger }: CreateApiKeyDialogProps) {
  const { t } = useTranslation(['api_keys'])
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<ApiKeyWithSecret | null>(null)
  const [permissionPreset, setPermissionPreset] = useState<PermissionPreset>('standard')
  const [expirationPreset, setExpirationPreset] = useState<ExpirationPreset>('never')
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)

  const [formData, setFormData] = useState<CreateApiKeyRequest>({
    name: '',
    key_type: ApiKeyType.USER,
    permissions: PERMISSION_PRESETS.standard.permissions,
    expires_at: null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || formData.permissions.length === 0) {
      return
    }

    setIsCreating(true)
    try {
      const result = await onCreateApiKey(formData)
      setCreatedKey(result)
      setOpen(false)

      // Reset form
      setFormData({
        name: '',
        key_type: ApiKeyType.USER,
        permissions: PERMISSION_PRESETS.standard.permissions,
        expires_at: null,
      })
      setPermissionPreset('standard')
      setExpirationPreset('never')
      setCustomDate(undefined)
    } catch (error) {
      console.error('Failed to create API key:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handlePermissionPresetChange = (preset: PermissionPreset) => {
    setPermissionPreset(preset)
    if (preset !== 'custom') {
      setFormData((prev) => ({ ...prev, permissions: PERMISSION_PRESETS[preset].permissions }))
    }
  }

  const handlePermissionsChange = (permissions: RolePermissionKey[]) => {
    setFormData((prev) => ({ ...prev, permissions }))
  }

  const handleExpirationPresetChange = (preset: ExpirationPreset) => {
    setExpirationPreset(preset)
    const now = new Date()

    switch (preset) {
      case '7days':
        setFormData((prev) => ({ ...prev, expires_at: addDays(now, 7).toISOString() }))
        break
      case '30days':
        setFormData((prev) => ({ ...prev, expires_at: addDays(now, 30).toISOString() }))
        break
      case '365days':
        setFormData((prev) => ({ ...prev, expires_at: addYears(now, 1).toISOString() }))
        break
      case 'never':
        setFormData((prev) => ({ ...prev, expires_at: null }))
        break
      case 'custom':
        // Keep current custom date or clear if none
        if (customDate) {
          setFormData((prev) => ({ ...prev, expires_at: customDate.toISOString() }))
        }
        break
    }
  }

  const handleCustomDateChange = (date: Date | undefined) => {
    setCustomDate(date)
    if (date) {
      setFormData((prev) => ({ ...prev, expires_at: date.toISOString() }))
    }
  }

  return (
    <>
      <CustomDialogV2
        size="md"
        open={open}
        setOpen={setOpen}
        onOpenChange={setOpen}
        title={t('api_keys:create_dialog.title')}
        description={t('api_keys:create_dialog.description')}
        button={
          trigger
            ? <span onClick={() => setOpen(true)}>{trigger}</span>
            : (
              <Button type="button" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('api_keys:create_button')}
              </Button>
            )
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('api_keys:create_dialog.name_label')}</Label>
            <Input
              id="name"
              placeholder={t('api_keys:create_dialog.name_placeholder')}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen} className="rounded-lg border border-slate-200">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors rounded-lg"
              >
                {t('api_keys:create_dialog.advanced_settings')}
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', isAdvancedOpen && 'rotate-180')}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 px-4 pb-4 border-t border-slate-200 pt-4">

          <div className="space-y-2">
            <Label>{t('api_keys:create_dialog.type_label')}</Label>
            <RadioGroup
              value={formData.key_type}
              onValueChange={(value: ApiKeyType) =>
                setFormData((prev) => ({ ...prev, key_type: value }))
              }
              className="grid grid-cols-2 gap-4"
            >
              <div
                className={cn(
                  'relative flex items-center space-x-3 rounded-lg border border-slate-300 bg-white px-4 py-3 cursor-pointer hover:border-violet-500 transition-colors',
                  formData.key_type === ApiKeyType.USER && 'border-violet-500 bg-violet-50'
                )}
              >
                <RadioGroupItem value={ApiKeyType.USER} id="type-user" className="shrink-0" />
                <Label htmlFor="type-user" className="cursor-pointer flex-1">
                  <div className="font-medium text-sm">{t('api_keys:create_dialog.type_user')}</div>
                  <div className="text-xs text-slate-500">
                    {t('api_keys:create_dialog.type_user_description')}
                  </div>
                </Label>
                <Info className="h-4 w-4 text-slate-400" />
              </div>
              <div
                className={cn(
                  'relative flex opacity-30 items-center space-x-3 rounded-lg border border-slate-300 bg-white px-4 py-3 cursor-pointer hover:border-violet-500 transition-colors',
                  formData.key_type === ApiKeyType.BOT && 'border-violet-500 bg-violet-50'
                )}
                title="Comming soon"
              >
                <RadioGroupItem
                  disabled={true}
                  value={ApiKeyType.BOT}
                  id="type-bot"
                  className="shrink-0"
                />
                <Label htmlFor="type-bot" className="cursor-pointer flex-1">
                  <div className="font-medium text-sm">{t('api_keys:create_dialog.type_bot')}</div>
                  <div className="text-xs text-slate-500">
                    {t('api_keys:create_dialog.type_bot_description')}
                  </div>
                </Label>
                <Info className="h-4 w-4 text-slate-400" />
              </div>
            </RadioGroup>
            <p className="text-xs text-slate-500">
              {formData.key_type === ApiKeyType.BOT
                ? t('api_keys:create_dialog.type_help_bot')
                : t('api_keys:create_dialog.type_help_user')}
            </p>
          </div>

          <div className="space-y-3">
            <Label>{t('api_keys:create_dialog.permissions_label')}</Label>
            <div className="grid grid-cols-4 gap-3">
              {(['read-only', 'standard', 'full', 'custom'] as PermissionPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={PERMISSION_PRESETS[preset].disabled}
                  onClick={() => handlePermissionPresetChange(preset)}
                  className={cn(
                    'disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-start p-3 rounded-lg border border-slate-300 bg-white hover:border-violet-500 transition-colors text-left',
                    permissionPreset === preset && 'border-violet-500 bg-violet-50'
                  )}
                >
                  <div className="font-medium text-sm text-slate-900">
                    {t(`api_keys:create_dialog.preset_${preset.replace('-', '_')}`)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {t(`api_keys:create_dialog.preset_${preset.replace('-', '_')}_desc`)}
                  </div>
                </button>
              ))}
            </div>

            {permissionPreset !== 'custom' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-700 mb-2">
                  {t('api_keys:create_dialog.permissions_summary', { preset: permissionPreset })}
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  {formData.permissions.slice(0, 5).map((permission) => (
                    <div key={permission} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                  ))}
                  {formData.permissions.length > 5 && (
                    <div className="text-slate-500 italic">
                      {t('api_keys:create_dialog.permissions_more', {
                        count: formData.permissions.length - 5,
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {permissionPreset === 'custom' && (
              <div className="border border-slate-200 rounded-lg p-4">
                <PermissionsSelector
                  selectedPermissions={formData.permissions}
                  onChange={handlePermissionsChange}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>{t('api_keys:create_dialog.expiration_label')}</Label>
            <div className="grid grid-cols-5 gap-2">
              {(['7days', '30days', '365days', 'never', 'custom'] as ExpirationPreset[]).map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleExpirationPresetChange(preset)}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-lg border border-slate-300 bg-white hover:border-violet-500 transition-colors text-center',
                      expirationPreset === preset && 'border-violet-500 bg-violet-50'
                    )}
                  >
                    <div className="text-xs font-medium text-slate-900">
                      {preset === '7days' && t('api_keys:create_dialog.expiration_7days')}
                      {preset === '30days' && t('api_keys:create_dialog.expiration_30days')}
                      {preset === '365days' && t('api_keys:create_dialog.expiration_365days')}
                      {preset === 'never' && t('api_keys:create_dialog.expiration_never')}
                      {preset === 'custom' && t('api_keys:create_dialog.expiration_custom')}
                    </div>
                  </button>
                )
              )}
            </div>

            {expirationPreset === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !customDate && 'text-slate-500'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, 'PPP') : t('api_keys:create_dialog.pick_date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customDate}
                    onSelect={handleCustomDateChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            {formData.expires_at && (
              <p className="text-xs text-slate-500">
                {t('api_keys:create_dialog.expires_on', {
                  date: dayjs(formData.expires_at).format('LLL'),
                })}
              </p>
            )}
          </div>

            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              {t('api_keys:create_dialog.cancel_button')}
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.name || formData.permissions.length === 0}
            >
              {isCreating
                ? t('api_keys:create_dialog.creating_button')
                : t('api_keys:create_dialog.create_button')}
            </Button>
          </div>
        </form>
      </CustomDialogV2>

      {createdKey && (
        <ApiKeyCreatedDialog apiKey={createdKey} onClose={() => setCreatedKey(null)} />
      )}
    </>
  )
}

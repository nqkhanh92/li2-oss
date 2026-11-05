import { Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GlobeIcon, History, Sparkles } from 'lucide-react'
import { BackHalfHistory } from '../../touch-point-details/backhalf-history'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { AISlugSuggestion } from '../../ai-slug-suggestion'
import { Control, useFormContext } from 'react-hook-form'
import { TouchPointFormValues } from '@/features/touch-points/hooks/use-touch-point-form'
import { DomainSelect } from '@/features/custom-domains/components/domain-select'
import { useShowTouchPoint } from '@/features/touch-points/hooks/queries'
import { useSlugCheck } from '@/features/touch-points/hooks'
import { standardizeSlug } from '@/shared/lib/slug'
import { useParams } from 'next/navigation'

/**
 * Read-only domain display for edit mode.
 * Only rendered when disableDomain=true so useShowTouchPoint is safe to call
 * (touch_point_id is always defined in that context).
 */
const DomainDisplayInput = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const domain = useMemo(() => {
    const fallback = process.env.NEXT_PUBLIC_SHORT_LINK_URL?.replace('https://', '') || ''
    if (!touchPoint?.short_url) return fallback
    try {
      return new URL(touchPoint.short_url).hostname
    } catch {
      return fallback
    }
  }, [touchPoint?.short_url])

  return (
    <Input
      readOnly
      tabIndex={-1}
      value={domain}
      className="bg-neutral-500 text-foreground/50 cursor-default pointer-events-none"
    />
  )
}

interface ShortLinkConfigurationProps {
  control: Control<TouchPointFormValues>
  // customDomains: Array<{ id: string; name: string | null }> | undefined
  // isLoadingDomains: boolean
  enableCustomDomain: boolean
  /** Disable the domain selector (e.g. in edit mode — domain cannot be changed) */
  disableDomain?: boolean
  destinationUrl?: string
  tempSuggestSlugs: string[]
  onSlugSelect: (slug: string) => void
  onSuggestSlugsChange: (slugs: string[]) => void
  triggerSlugCheck: () => void
  /** Original slug when editing — prevents availability check firing on load */
  currentSlug?: string
  mode?: 'create' | 'edit'
}

/**
 * Short link configuration with domain selector and slug input
 */
export const ShortLinkConfiguration = ({
  control,
  // customDomains,
  // isLoadingDomains,
  enableCustomDomain,
  disableDomain,
  destinationUrl,
  tempSuggestSlugs,
  onSlugSelect,
  onSuggestSlugsChange,
  triggerSlugCheck,
  currentSlug,
  mode = 'create',
}: ShortLinkConfigurationProps) => {
  const { t } = useTranslation(['common', 'touchpoint'])
  const { setValue } = useFormContext<TouchPointFormValues>()
  const { slugStatus, slugStatusIcon } = useSlugCheck({
    control,
    onTriggerValidation: triggerSlugCheck,
    currentSlug,
  })

  // Construct preview URL
  const previewUrl = '' // slug ? `${domainName}/${slug}` : null

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <GlobeIcon className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">
              {t('touchpoint:touch_point_create.form.shortLinkSettings.title')}
            </span>
          </div>
          {mode === 'edit' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="outline-none">
                <Button
                  size="sm"
                  type="button"
                  className="text-slate-500 text-s"
                  variant="tertiary"
                  iconLeft={<History size={18} />}
                >
                  {t('touchpoint:form.actions.slug_history')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-background border border-slate-100 rounded-[16px] p-4 w-[404px]"
              >
                <Suspense fallback={<SkeletonCard className="h-[100px] w-full" />}>
                  <BackHalfHistory />
                </Suspense>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className="flex md:flex-row flex-col md:gap-2 gap-4 w-full">
        {/* Domain Selector */}
        <div className="min-w-3/12 w-full">
          {disableDomain ? (
            <FormItem className="flex flex-col gap-1 space-y-0">
              <FormLabel className="leading-5">
                {t('touchpoint:touch_point_create.form.shortLinkSettings.domainSelectLabel')}
              </FormLabel>
              <DomainDisplayInput />
            </FormItem>
          ) : (
            <FormField
              control={control}
              name="domain_id"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1 space-y-0">
                  <FormLabel className="leading-5">
                    {t('touchpoint:touch_point_create.form.shortLinkSettings.domainSelectLabel')}
                  </FormLabel>
                  <FormControl>
                    <DomainSelect
                      value={field.value}
                      onChange={(val) => setValue('domain_id', val, { shouldDirty: false })}
                      placeholder={t(
                        'touchpoint:touch_point_create.form.shortLinkSettings.domainSelectPlaceholder'
                      )}
                      commandPlaceholder={t(
                        'touchpoint:touch_point_create.form.shortLinkSettings.domainSearchPlaceholder'
                      )}
                      className="text-slate-900 hover:text-slate-500 shadow-none border-transparent hover:bg-slate-100 hover:border-slate-200 focus:border-slate-400"
                      classNameLabel="text-slate-500 hover:text-slate-500"
                      enableCustomDomain={enableCustomDomain}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Slug Input */}
        <div className="lg:max-w-9/12 lg:min-w-8/12 w-full">
          <FormField
            control={control}
            name="slug"
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-col gap-1 space-y-0">
                <FormLabel className="leading-5">
                  {t('touchpoint:touch_point_create.form.shortLinkSettings.customBackHalfLabel')}
                </FormLabel>
                <FormControl className="py-0 max-h-10 pr-4!">
                  <Input
                    className="pr-0! overflow-hidden text-ellipsis whitespace-nowrap"
                    placeholder={t(
                      'touchpoint:touch_point_create.form.shortLinkSettings.customBackHalfPlaceholder'
                    )}
                    {...field}
                    onBlur={(e) => {
                      const standardized = standardizeSlug(e.target.value)
                      field.onChange(standardized)
                      field.onBlur()
                    }}
                    endAdornment={
                      <div className="flex items-center gap-3">
                        {slugStatusIcon}
                        <LockableSection lockBy="coming_soon" locked={false} variant="hover">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild className="rounded-l-none">
                              <Button
                                variant="default"
                                className="w-10 bg-[linear-gradient(90deg,#B9AAFF_0.08%,#D6A4AF_98.87%)]"
                              >
                                <Sparkles className="w-5! h-5! text-white" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              sideOffset={20}
                              className="p-0 w-full md:w-[430px] md:max-w-full max-w-full shadow-[0_4px_8px_0_rgba(5,27,68,0.08)] rounded-[6px] border-none ml-[5%] md:ml-0"
                            >
                              <AISlugSuggestion
                                onSlugSelect={onSlugSelect}
                                url={destinationUrl}
                                defaultSuggestSlugs={tempSuggestSlugs || []}
                                onSuggestSlugsChange={onSuggestSlugsChange}
                              />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </LockableSection>
                      </div>
                    }
                  />
                </FormControl>
                {!fieldState.error && slugStatus === 'taken' && (
                  <FormMessage>{t('common:messages.error.slug_is_taken')}</FormMessage>
                )}
                {!fieldState.error && slugStatus !== 'taken' && (
                  <FormDescription>
                    {t('touchpoint:form.tooltips.custom_back_half')}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      {previewUrl && (
        <div className="text-sm text-slate-600 mt-2">
          {t('touchpoint:touch_point_create.form.shortLinkSettings.previewText')}:{' '}
          <span className="font-medium text-blue-600">https://{previewUrl}</span>
        </div>
      )}
    </div>
  )
}

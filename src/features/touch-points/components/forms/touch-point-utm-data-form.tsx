// type TouchPointUtmDataFormProps = {

import { SingleTagSelect } from '@/shared/components/customize/single-tag-select'
import { FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Separator } from '@/shared/components/ui/separator'
import {
  popularUTMSources,
  popularUTMMediums,
} from '@/features/touch-points/constants/touch-points'
import { advancedTouchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { GoalIcon, MousePointerClick, TextIcon, TextSearchIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

type TouchPointUtmDataFormProps = {
  shortLink: string
  destination: string
}
export const TouchPointUtmDataForm = ({ shortLink, destination }: TouchPointUtmDataFormProps) => {
  const { control, formState, setValue, watch } =
    useFormContext<z.infer<typeof advancedTouchPointUpdateSchema>>()
  const [savedUTMSource, setSavedUTMSource] = useState<string[]>(
    JSON.parse(localStorage.getItem('saved_utm_source') || '[]')
  )
  const [savedUTMMedium, setSavedUTMMedium] = useState<string[]>(
    JSON.parse(localStorage.getItem('saved_utm_medium') || '[]')
  )
  useEffect(() => {
    localStorage.setItem('saved_utm_source', JSON.stringify(savedUTMSource))
    localStorage.setItem('saved_utm_medium', JSON.stringify(savedUTMMedium))
  }, [savedUTMSource, savedUTMMedium])
  // const watchOverrideable = watch("utm_tags.overrideable");
  // const watchUtmId = watch("utm_tags.utm_id");
  const watchUtm = watch('utm_tags')

  const exampleRedirectUrl = useMemo(() => {
    if (!shortLink) return null
    const utmParams = new URLSearchParams()
    if (watchUtm?.utm_source) {
      utmParams.set('utm_source', watchUtm?.utm_source)
    }
    if (watchUtm?.utm_medium) {
      utmParams.set('utm_medium', watchUtm?.utm_medium)
    }
    if (watchUtm?.utm_campaign) {
      utmParams.set('utm_campaign', watchUtm?.utm_campaign)
    }
    if (watchUtm?.utm_term) {
      utmParams.set('utm_term', watchUtm?.utm_term)
    }
    if (watchUtm?.utm_content) {
      utmParams.set('utm_content', watchUtm?.utm_content)
    }

    if (watchUtm?.overrideable) {
      return {
        url: `${shortLink}?utm_source=google&utm_medium=cpc`,
        redirect: `${destination}${watchUtm?.utm_id ? `` : '?utm_source=google&utm_medium=cpc'}`,
      }
    }
    return {
      url: `${shortLink}`,
      redirect: `${destination}${
        watchUtm?.utm_id ? `` : `${utmParams.size > 0 ? `?${utmParams.toString()}` : ''}`
      }`,
    }
  }, [shortLink, destination, JSON.stringify(watchUtm)])
  const { t } = useTranslation('advanced_custom')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex lg:flex-row flex-col gap-4">
        <div className="w-full space-y-4">
          <label className="text-[15px] font-semibold">{t('common:label.required')}</label>
          <FormField
            control={control}
            name="utm_tags.utm_source"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div
                    className={
                      'flex rounded-[8px] overflow-hidden border border-transparent hover:border-slate-400 focus:border-slate-400'
                    }
                  >
                    <div className="flex-1">
                      <SingleTagSelect
                        commandPlaceholder={t('common:form.input.search_or_add')}
                        placeholder="e.g. adwords, google, mailchimp"
                        className="rounded-l-none pl-3! hover:bg-slate-100 border-transparent hover:border-transparent focus:outline-hidden text-slate-500 hover:text-slate-500"
                        classNameLabel="text-slate-400"
                        value={field.value}
                        onChange={field.onChange}
                        groups={savedUTMSource.length > 0 ? ['Saved', 'Popular'] : ['Popular']}
                        onCreate={(value) => {
                          setSavedUTMSource([...savedUTMSource, value])
                        }}
                        onDelete={(value) => {
                          setSavedUTMSource(savedUTMSource.filter((v) => v !== value))
                        }}
                        options={[
                          ...popularUTMSources.map((source) => ({
                            value: source,
                            label: source,
                            group: 'Popular',
                          })),
                          ...savedUTMSource.map((source) => ({
                            value: source,
                            label: source,
                            group: 'Saved',
                            deleteable: true,
                          })),
                        ]}
                        startAdornment={
                          <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                            <MousePointerClick className="w-5 h-5" /> Source
                          </div>
                        }
                      />
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* <div className="w-full space-y-4">
          <label className="text-[15px] font-semibold ">Optional</label>
          <FormField
            control={control}
            name="utm_tags.utm_id"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    className="pl-0! overflow-hidden [&_input]:pl-3 gap-3 max-h-10 "
                    variant="default"
                    startAdornment={
                      <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                        GA4 ID/ GTM ID
                      </div>
                    }
                    endAdornment={
                      <div className="h-full flex items-center">
                        <CustomToolTip
                          contentClassName="bg-background border-neutral-700 text-slate-900 text-wrap max-w-[320px]"
                          content="When this field is filled, the UTM parameters will be sent to the specified GA4 or GTM ID instead of being sent to the touchpoint URL."
                          children={
                            <CircleHelpIcon className="w-5 h-5 text-blue-500" />
                          }
                        />
                      </div>
                    }
                    placeholder="GTM-XXXXXXX or G-XXXXXXX"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div> */}
      </div>

      <div className="flex flex-col gap-4">
        <label className="text-[15px] font-semibold lg:block hidden">
          {t('common:label.optional')}
        </label>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="utm_tags.utm_campaign"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    className="pl-0! overflow-hidden [&_input]:pl-3 gap-3 max-h-10"
                    variant="default"
                    startAdornment={
                      <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                        <GoalIcon className="w-5 h-5" /> Campaign
                      </div>
                    }
                    placeholder="e.g. holiday special, birthday promotion"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="utm_tags.utm_medium"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div
                    className={
                      'flex rounded-[8px] overflow-hidden border border-transparent hover:border-slate-400 focus:border-slate-400'
                    }
                  >
                    <div className="flex-1">
                      <SingleTagSelect
                        commandPlaceholder={t('common:form.input.search_or_add')}
                        placeholder="e.g. banner ad, email, social post"
                        className="rounded-l-none pl-3! hover:bg-slate-100 border-transparent hover:border-transparent focus:outline-hidden text-slate-500 hover:text-slate-500"
                        classNameLabel="text-slate-400"
                        value={field.value}
                        onChange={field.onChange}
                        groups={savedUTMMedium.length > 0 ? ['Saved', 'Popular'] : ['Popular']}
                        onCreate={(value) => {
                          setSavedUTMMedium([...savedUTMMedium, value])
                        }}
                        onDelete={(value) => {
                          setSavedUTMMedium(savedUTMMedium.filter((v) => v !== value))
                        }}
                        options={[
                          ...popularUTMMediums.map((medium) => ({
                            value: medium,
                            label: medium,
                            group: 'Popular',
                          })),
                          ...savedUTMMedium.map((medium) => ({
                            value: medium,
                            label: medium,
                            group: 'Saved',
                            deleteable: true,
                          })),
                        ]}
                        startAdornment={
                          <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                            <MousePointerClick className="w-5 h-5" /> Medium
                          </div>
                        }
                      />
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="utm_tags.utm_term"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    className="pl-0! overflow-hidden [&_input]:pl-3 gap-3 max-h-10"
                    variant="default"
                    startAdornment={
                      <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                        <TextSearchIcon className="w-5 h-5" /> Term
                      </div>
                    }
                    placeholder="e.g. iphone 15, wireless earbuds, hotel deal"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="utm_tags.utm_content"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    className="pl-0! overflow-hidden [&_input]:pl-3 gap-3 max-h-10"
                    variant="default"
                    startAdornment={
                      <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                        <TextIcon className="w-5 h-5" /> Content
                      </div>
                    }
                    placeholder="e.g. video_ad_short, popup_offer_button, banner_ad_1"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      {/* <div className="flex gap-3">
        <FormField
          control={control}
          name="utm_tags.overrideable"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <div>
                    <FormLabel>
                      {t("advanced_form.utm_tags.allow_utm_overwrite")}
                    </FormLabel>
                    <FormDescription>
                      {t(
                        "advanced_form.utm_tags.allow_utm_overwrite_description"
                      )}
                    </FormDescription>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div> */}
      <Separator className="w-full h-px bg-neutral-700" />
      <div>
        <p className="text-[16px] font-semibold text-blue-600">
          {t('advanced_form.utm_tags.redirect_example')}
        </p>
        <div className="text-[14px] text-foreground font-medium [&_span]:italic [&_span]:font-normal [&_span]:text-slate-600">
          <p>
            {t('advanced_form.utm_tags.when_a_user_visits')}: <span>{exampleRedirectUrl?.url}</span>
          </p>
          <p>
            {t('advanced_form.utm_tags.they_will_be_redirected_to')}:{' '}
            <span>{exampleRedirectUrl?.redirect}</span>
          </p>
        </div>
      </div>
      {/* {watchUtm?.utm_id && (
        <Alert variant="info" size="lg" className="px-6 py-4">
          <AlertTitle className="text-[16px]">
            {t("advanced_form.utm_tags.ga4_id_gtm_id_feature_is_enabled")}
          </AlertTitle>
          <AlertDescription>
            {t(
              "advanced_form.utm_tags.ga4_id_gtm_id_feature_is_enabled_description"
            )}
          </AlertDescription>
        </Alert>
      )} */}
      {/* {watchUtm?.overrideable && (
        <Alert variant="info" size="lg" className="px-6 py-4">
          <AlertTitle className="text-[16px]">
            {t("advanced_form.utm_tags.allow_utm_overwrite")}
          </AlertTitle>
          <AlertDescription>
            {t("advanced_form.utm_tags.full_example_allow_utm")}
          </AlertDescription>
        </Alert>
      )} */}
    </div>
  )
}

import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { useGetIntegrationDropdowns } from '@/features/integrations/hooks/queries'
import {
  useGetParcelvoyEntrances,
  useGetParcelvoyJourneys,
} from '@/features/integrations/hooks/queries/parcelvoy'
import { advancedTouchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { useParams } from 'next/navigation'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
export const TouchPointIntegrationForm = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const { control, watch, setValue } =
    useFormContext<z.infer<typeof advancedTouchPointUpdateSchema>>()
  const { data: integrations, isLoading } = useGetIntegrationDropdowns(org_id)
  const watchIntegrationId = watch('integration.integration_id')
  const { data: journeys, isLoading: journeysLoading } = useGetParcelvoyJourneys(
    org_id,
    watchIntegrationId
  )
  const watchJourneyId = watch('integration.integration_config.journey_id')
  const { data: entrances, isLoading: entrancesLoading } = useGetParcelvoyEntrances(
    org_id,
    watchIntegrationId,
    watchJourneyId
  )
  const resetFormFields = (resetJourney?: boolean, resetEntrance?: boolean) => {
    if (resetJourney) {
      setValue('integration.integration_config.journey_id', '')
    }
    if (resetEntrance) {
      setValue('integration.integration_config.entrance_id', '')
    }
  }
  const watchEnabled = watch('integration.enabled')
  const { t } = useTranslation('advanced_custom')
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* <FormField
        control={control}
        name="integration.enabled"
        render={({ field }) => (
          <div className="flex flex-col px-4 py-[6px] w-fit rounded-[8px] border border-neutral-700">
            <div className="flex items-center justify-end gap-2">
              <Label>Parcelvoy Based</Label>
              <Switch
                className="flex"
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                }}
                checked={field.value}
              />
            </div>
          </div>
        )}
      /> */}
      <FormField
        control={control}
        name="integration.integration_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('common:module.integration')}</FormLabel>
            <FormControl>
              <SingleCommandSelect
                disabled={isLoading || !watchEnabled}
                placeholder={t('common:form.fields.select', {
                  field: t('common:module.integration'),
                })}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value)
                  resetFormFields(true, true)
                }}
                options={integrations?.map((integration) => ({
                  value: integration.id,
                  label: integration.name,
                }))}
                className="shadow-none border-transparent hover:bg-slate-100 hover:border-slate-400 text-slate-400 hover:text-slate-400"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <LoadingMask loading={journeysLoading}>
        <FormField
          control={control}
          name="integration.integration_config.journey_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common:module.journey')}</FormLabel>
              <FormControl>
                <SingleCommandSelect
                  disabled={!watchIntegrationId || !watchEnabled}
                  placeholder={t('common:form.fields.select', {
                    field: t('common:module.journey'),
                  })}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value)
                    resetFormFields(false, true)
                  }}
                  options={journeys?.map((journey) => ({
                    value: `${journey.id}`,
                    label: journey.name || 'No name',
                  }))}
                  className="shadow-none border-transparent hover:bg-slate-100 hover:border-slate-400 text-slate-400 hover:text-slate-400"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </LoadingMask>
      <LoadingMask loading={entrancesLoading}>
        <FormField
          control={control}
          name="integration.integration_config.entrance_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common:module.entrance')}</FormLabel>
              <FormControl>
                <SingleCommandSelect
                  disabled={!watchJourneyId || !watchEnabled}
                  placeholder={t('common:form.fields.select', {
                    field: t('common:module.entrance'),
                  })}
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  options={entrances?.map((entrance) => ({
                    value: `${entrance.id}`,
                    label: entrance.name || 'No name',
                  }))}
                  className="shadow-none border-transparent hover:bg-slate-100 hover:border-slate-400 text-slate-400 hover:text-slate-400"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </LoadingMask>
    </div>
  )
}

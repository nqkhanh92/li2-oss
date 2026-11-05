import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { advancedTouchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/shared/components/ui/form'
import { Card, CardContent } from '@/shared/components/ui/card'
import { FormField } from '@/shared/components/ui/form'
import { TouchPointMetaDataForm } from './touch-point-meta-data-form'
import { GetTouchPointObject } from '@/app/api/organizations/[org_id]/touch-points/route'
import { useEffect, useMemo, useState } from 'react'
import { isCloud } from '@/shared/constants/edition'
import { TouchPointIntegrationForm } from './touch-point-integration-form'
import { Switch } from '@/shared/components/ui/switch'
import { AnimatePresence } from 'framer-motion'
import { motion } from 'framer-motion'
import { Button } from '@/shared/components/ui/button'
import { TouchPointUtmDataForm } from './touch-point-utm-data-form'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useUpdateAdvancedTouchPoint } from '@/features/touch-points/hooks/mutations'
import { useParams } from 'next/navigation'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { Crown, CrownIcon, Rocket, SparklesIcon } from 'lucide-react'
import { defineSubmenu } from '@/shared/components/customize/custom-submenu'
import { useTranslation } from 'react-i18next'

const subMenuItems = [
  { label: 'Parcelvoy Based', key: 'parcelvoy', icon: CrownIcon },
  { label: 'Meta Tags', key: 'meta_tags', icon: CrownIcon },
  { label: 'UTM Parameters', key: 'utm_tags', icon: CrownIcon },
] as const
const { SubMenu, SubMenuProvider, SubMenuContent } = defineSubmenu(subMenuItems, { mode: 'sticky' })

export const TouchPointAdvancedForm = ({ initialData }: { initialData?: GetTouchPointObject }) => {
  const { org_id, touch_point_id } = useParams<{
    org_id: string
    touch_point_id: string
  }>()
  const { setEnabled, back } = useFormWarningProvider()

  const defaultValues = useMemo(() => {
    const values = Object.fromEntries(
      Object.entries(initialData || {})?.filter(([_, value]) => value !== null)
    )
    return values
  }, [initialData])
  const form = useForm<z.infer<typeof advancedTouchPointUpdateSchema>>({
    resolver: zodResolver(advancedTouchPointUpdateSchema),
    defaultValues,
  })
  const handleSubmit = (values: z.infer<typeof advancedTouchPointUpdateSchema>) => {
    updateTouchPoint(values, {
      onSuccess: () => {
        setEnabled(false)
        form.reset(values)
      },
    })
  }
  const watchMetaTagsEnabled = form.watch('meta_tags.enabled')
  const watchIntegrationEnabled = form.watch('integration.enabled')
  const watchUTMEnabled = form.watch('utm_tags.enabled')
  useEffect(() => {
    setEnabled(form.formState.isDirty)
  }, [form.formState.isDirty])
  const { mutate: updateTouchPoint, isPending: isLoadingUpdateTouchPoint } =
    useUpdateAdvancedTouchPoint(org_id, touch_point_id)
  const { orgPlan } = useOrganizationStoreProvider()

  const enableMetaTags = useMemo(() => {
    if (orgPlan) {
      return orgPlan.allow_custom_meta_tags
    }
    return false
  }, [orgPlan])

  const enableUTM = useMemo(() => {
    if (orgPlan) {
      return orgPlan.allow_custom_utm_tags
    }
    return false
  }, [orgPlan])

  const enableParcelvoy = useMemo(() => {
    if (orgPlan) {
      return orgPlan.max_integrations_per_org > 0
    }
    return false
  }, [orgPlan])

  const [showFormSection, setShowFormSection] = useState({
    meta_tags: false,
    integration: false,
    utm_tags: false,
  })
  useEffect(() => {
    setShowFormSection({
      meta_tags: watchMetaTagsEnabled ?? false,
      integration: watchIntegrationEnabled ?? false,
      utm_tags: watchUTMEnabled ?? false,
    })
  }, [watchMetaTagsEnabled, watchIntegrationEnabled, watchUTMEnabled])
  useEffect(() => {
    setShowFormSection((prev) => ({
      meta_tags: form.formState.errors.meta_tags ? true : prev.meta_tags,
      integration: form.formState.errors.integration ? true : prev.integration,
      utm_tags: form.formState.errors.utm_tags ? true : prev.utm_tags,
    }))
  }, [form.formState.errors])

  const watchFile = form.watch('meta_tags.image')
  const isFileDirty = useMemo(() => {
    return watchFile !== form.formState.defaultValues?.meta_tags?.image
  }, [form.formState.defaultValues, watchFile])

  const { t } = useTranslation('advanced_custom')
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="flex flex-col flex-1 gap-4">
          <div className="flex flex-col gap-6">
            {/* <div key="parcelvoy">
              <LockableSection
                locked={!enableParcelvoy}
                renderLock={
                  <Button
                    id="button"
                    variant="outline"
                    type="button"
                    className={`text-primary border-neutral-500 bg-background gap-2 rounded-full px-3 py-1.5 text-xs font-medium leading-4 h-auto shadow-xs hover:bg-white hover:border-neutral-500`}
                    onClick={() => {
                    }}
                  >
                    <SparklesIcon />
                    {t('advanced_form.lockable.label')}
                  </Button>
                }
              >
                <Card
                  className={`rounded-2xl bg-white space-y-0 gap-6 p-6 col-span-8 shadow-none border-none flex flex-col`}
                >
                  <CardContent className="flex flex-col gap-3 p-0">
                    <div className="flex justify-between items-center ">
                      <div className="flex flex-col gap-[2px]">
                        <div className="relative text-lg leading-[28px] font-semibold text-foreground w-fit">
                          {t('advanced_form.parcevoy.label')}
                          <Crown
                            className="absolute top-[calc(30%-6px)] -right-[calc(25%-6px)] w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-neutral-900 stroke-neutral-900"
                            size={10}
                          />
                        </div>
                        <span className="text-sm leading-[20px] text-slate-600">
                          {t('advanced_form.parcevoy.description')}
                        </span>
                      </div>
                      <FormField
                        control={form.control}
                        name="integration.enabled"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                    <AnimatePresence initial={false}>
                      {showFormSection.integration && (
                        <motion.div
                          key="integration-form"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{ overflow: 'hidden' }}
                        >
                          {isCloud && <TouchPointIntegrationForm />}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </LockableSection>
            </div> */}
            <div key="meta_tags">
              <LockableSection
                locked={!enableMetaTags}
                renderLock={
                  <Button
                    id="button"
                    variant="outline"
                    type="button"
                    size="xs"
                    className={`rounded-full`}
                    onClick={() => {
                      // router.push("/pricing");
                    }}
                    iconLeft={<SparklesIcon />}
                  >
                    {/* Upgrade to Premium */}
                    {t('advanced_form.lockable.label')}
                  </Button>
                }
              >
                <Card
                  className={`rounded-2xl bg-white space-y-0 gap-6 p-6 col-span-8 shadow-none border-none flex flex-col`}
                >
                  <CardContent className="flex flex-col gap-4 p-0">
                    <div className="flex justify-between items-center ">
                      <div className="flex flex-col gap-[2px]">
                        <div className="relative text-lg leading-[28px] font-semibold text-foreground w-fit">
                          {t('advanced_form.meta_tags.label')}
                          <Crown
                            className="absolute top-[calc(30%-6px)] -right-[calc(25%-6px)] w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-neutral-900 stroke-neutral-900"
                            size={10}
                          />
                        </div>
                        <span className="text-sm leading-[20px] text-slate-600">
                          {t('advanced_form.meta_tags.description')}
                        </span>
                      </div>
                      <FormField
                        control={form.control}
                        name="meta_tags.enabled"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                    <AnimatePresence initial={false}>
                      {showFormSection.meta_tags && (
                        <motion.div
                          key="metadata-form"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <TouchPointMetaDataForm short_url={initialData?.short_url ?? ''} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </LockableSection>
            </div>
            <div key="utm_tags">
              <LockableSection
                locked={!enableUTM}
                renderLock={
                  <Button
                    id="button"
                    variant="outline"
                    type="button"
                    size="xs"
                    className={`rounded-full`}
                    onClick={() => {
                      // router.push("/pricing");
                    }}
                  >
                    <SparklesIcon />
                    {t('advanced_form.lockable.label')}
                  </Button>
                }
              >
                <Card
                  className={`rounded-2xl bg-white space-y-0 gap-6 p-6 col-span-8 shadow-none border-none flex flex-col`}
                >
                  <CardContent className="flex flex-col gap-3 p-0">
                    <div className="flex justify-between items-center ">
                      <div className="flex flex-col gap-[2px]">
                        <div className="relative text-lg leading-[28px] font-semibold text-foreground w-fit">
                          {t('advanced_form.utm_tags.label')}
                          {/* <Crown
                            className="absolute top-[calc(25%-6px)] -right-[calc(15%-6px)] w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-neutral-900 stroke-neutral-900"
                            size={10}
                          /> */}
                        </div>
                        <span className="text-sm leading-[20px] text-slate-600">
                          {t('advanced_form.utm_tags.description')}
                        </span>
                      </div>
                      <FormField
                        control={form.control}
                        name="utm_tags.enabled"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                    <AnimatePresence initial={false}>
                      {showFormSection.utm_tags && (
                        <motion.div
                          key="integration-form"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <TouchPointUtmDataForm
                            shortLink={initialData?.short_url ?? ''}
                            destination={initialData?.content_value ?? ''}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </LockableSection>
            </div>
          </div>
          <div className="flex gap-6 items-center flex-1">
            <LoadingButton
              type="submit"
              variant={'default'}
              isLoading={isLoadingUpdateTouchPoint}
              disabled={!form.formState.isDirty && !isFileDirty}
            >
              {t('touchpoint:touch_point_edit.button_list.update_button')}
            </LoadingButton>
            <Button type="button" onClick={() => back()} variant="secondary">
              {t('common:text.cancel')}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
      </form>
    </Form>
  )
}

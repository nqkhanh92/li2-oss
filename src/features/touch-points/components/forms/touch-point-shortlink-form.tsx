import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { updateShortLinkSchema } from '@/shared/schemas/touch-points'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useParams } from 'next/navigation'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { Button } from '@/shared/components/ui/button'
import { Crown, SeparatorHorizontal, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { useUpdateTouchPointShortLink } from '@/features/touch-points/hooks/mutations'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useGetTouchPointSlugs } from '@/features/touch-points/hooks/queries'
import { parse } from 'tldts'
import { useMemo, useRef } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import imageError from '@/public/images/reach_limit_slug_touchpoint.webp'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { AISlugSuggestion } from '../ai-slug-suggestion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { PAID_PLAN_KEYS } from '@/shared/types/plan-permission'

type TouchPointShortLinkFormProps = {
  initialData: z.infer<typeof updateShortLinkSchema> & {
    suggested_slugs: string[]
  }
  onFinish: () => void
}
export const TouchPointShortLinkForm = ({
  initialData,
  onFinish,
}: TouchPointShortLinkFormProps) => {
  const { org_id, touch_point_id } = useParams<{
    org_id: string
    touch_point_id: string
  }>()
  const form = useForm<z.infer<typeof updateShortLinkSchema>>({
    resolver: zodResolver(updateShortLinkSchema),
    defaultValues: initialData,
  })

  const { mutate: updateTouchPointShortLink, isPending } = useUpdateTouchPointShortLink(
    org_id,
    touch_point_id
  )
  const handleSubmit = (values: z.infer<typeof updateShortLinkSchema>) => {
    updateTouchPointShortLink(values, {
      onSuccess: () => {
        onFinish()
      },
    })
  }
  const { data: tp, isLoading } = useGetTouchPointSlugs(org_id, touch_point_id)
  const domain = useMemo(() => {
    return parse(tp?.short_url || '').hostname
  }, [tp])
  const { orgPlan } = useOrganizationStoreProvider()
  const reachedMaxSlugs = useMemo(() => {
    if (tp && orgPlan) {
      return tp.slugs.length >= orgPlan.max_slugs_per_tp
    }
    return false
  }, [tp, orgPlan])

  const { t } = useTranslation('advanced_custom')

  const aiOptimizeRef = useRef<DialogCustomRef>(null)

  const handleSlugSelect = (slug: string) => {
    form.setValue('slug', slug, {
      shouldDirty: true,
    })
    aiOptimizeRef.current?.close()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-6">
          <div className="space-y-4">
            {!reachedMaxSlugs && (
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('advanced_custom:form.short_link.back_half')}</FormLabel>
                    <FormControl>
                      <Input
                        className="pr-0! max-h-10 z-10 overflow-hidden"
                        placeholder={t('common:form.signature_slug')}
                        defaultValue={initialData?.slug}
                        disabled={reachedMaxSlugs}
                        {...field}
                        endAdornment={
                          <LockableSection lockBy="coming_soon" variant="hover">
                            {/* <Sparkles className="w-5 h-5 text-slate-400" onClick={handleAiOptimizeOpen}/> */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild className="rounded-l-none">
                                <Button
                                  disabled
                                  variant="default"
                                  className="font-medium flex gap-1 text-base text-white bg-black hover:text-black hover:bg-secondary"
                                >
                                  <Sparkles className="w-5! h-5! text-white" />
                                  AI
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                sideOffset={20}
                                className="p-0 w-full md:w-[430px] md:max-w-full max-w-full shadow-[0_4px_8px_0_rgba(5,27,68,0.08)] rounded-[6px] border-none ml-[5%] md:ml-0"
                              >
                                <AISlugSuggestion
                                  onSlugSelect={handleSlugSelect}
                                  touch_point_id={touch_point_id}
                                  url={initialData?.content_value || ''}
                                  defaultSuggestSlugs={initialData?.suggested_slugs || []}
                                  isInTp={true}
                                />
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </LockableSection>
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {reachedMaxSlugs ? (
              <Alert variant="warning">
                <AlertTitle className="text-sm text-yellow-600 mb-[2px]">
                  {t('touchpoint:touch_point_edit.slugs.reached_limit_title')}
                </AlertTitle>
                <AlertDescription>
                  <div className="flex flex-col gap-2">
                    <span>
                      {t('touchpoint:touch_point_edit.slugs.reached_limit_description', {
                        maxSlugs: orgPlan?.max_slugs_per_tp ?? 0,
                        planName:
                          (orgPlan?.name?.charAt(0).toUpperCase() ?? '') +
                          (orgPlan?.name?.slice(1).toLowerCase() ?? ''),
                      })}
                      <br />
                      {t('touchpoint:touch_point_edit.slugs.reached_limit_cta')}
                      <Link href="https://li2.ai/vi/support" className="text-primary">
                        {t('touchpoint:touch_point_edit.slugs.reached_limit_cta_link')}
                      </Link>
                      .
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="text-slate-500 text-sm flex items-center gap-2">
                {PAID_PLAN_KEYS.includes(orgPlan?.plan_key as any) && (
                  <Crown className="w-5 h-5 min-w-5 min-h-5 fill-slate-400 stroke-slate-400" />
                )}
                <span>
                  {t('touchpoint:touch_point_edit.slugs.create_up_to', {
                    maxSlugs: orgPlan?.max_slugs_per_tp ?? 0,
                    planName:
                      (orgPlan?.name?.charAt(0).toUpperCase() ?? '') +
                      (orgPlan?.name?.slice(1).toLowerCase() ?? ''),
                  })}
                </span>
              </div>
            )}
            {reachedMaxSlugs && (
              <div className="w-full items-center justify-center flex">
                <div
                  className="items-center justify-center flex bg-contain bg-center w-[300px] h-[144px]"
                  style={{ backgroundImage: `url(${imageError.src})` }}
                ></div>
              </div>
            )}
          </div>
          <SeparatorHorizontal className="w-full h-px bg-neutral-700" />
          {isLoading ? (
            <Skeleton className="w-full h-[200px]" />
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-foreground text-[15px] font-semibold">
                  {t('touchpoint:touch_point_edit.slugs.back_half_history', {
                    maxSlugs: orgPlan?.max_slugs_per_tp ?? 0,
                  })}
                </h2>
                <p className="text-[14px] text-slate-600">
                  {t('touchpoint:touch_point_edit.slugs.back_half_history_description')}
                </p>
              </div>
              <div className="space-y-2">
                {tp?.slugs?.map((slug) => (
                  <div key={slug.id} className="flex gap-2 items-center">
                    <p className="text-[14px] text-slate-600 font-medium">
                      https://{domain}/{slug.slug}
                    </p>
                    {slug.slug === tp?.slug && (
                      <Badge variant="success" size="xs">
                        {t('common:text.latest')}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-6 justify-center items-center">
            <Button type="button" variant="secondary" onClick={onFinish}>
              {t('common:buttons.cancel')}
            </Button>
            {!reachedMaxSlugs && (
              <LoadingButton
                type="submit"
                className="flex-1"
                isLoading={isPending}
                disabled={reachedMaxSlugs || isLoading || !form.formState.isDirty}
              >
                {t('common:buttons.save', { field: '' })}
              </LoadingButton>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}

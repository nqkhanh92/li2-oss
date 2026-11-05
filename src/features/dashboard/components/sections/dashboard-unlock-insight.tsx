import { cn } from '@/shared/lib/cn'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Sparkles } from 'lucide-react'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { CheckIcon } from '@/shared/components/icons/check-icon'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { benefitIncludeOrg, PlanId } from '@/shared/constants'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { CustomCountdown } from '@/shared/components/customize/count-down'
import qrEndingSoon from '@/public/images/ending_soon_qr.webp'
import ctaEndingSoon from '@/public/images/ending_soon_cta.webp'
import Image from 'next/image'
import { Trans, useTranslation } from 'react-i18next'

export const DashboardUnlockInsight = () => {
  const router = useRouter()
  const { orgPlan } = useOrganizationStoreProvider()
  const [months, setMonths] = useState(0)
  const [days, setDays] = useState(0)
  const { t, i18n } = useTranslation('dashboard')
  const currentInsight = useMemo(() => {
    return benefitIncludeOrg[orgPlan?.id as PlanId] || benefitIncludeOrg[PlanId.FREE]
  }, [orgPlan?.id, i18n.language])

  const expiryDate = useMemo(() => {
    const date = new Date(orgPlan?.expires_at || new Date())
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [orgPlan?.expires_at])

  const isFreePlan = useMemo(() => orgPlan?.id === PlanId.FREE, [orgPlan?.id])

  const isEndingSoon = useMemo(() => months === 0 && days < 30, [months, days])

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date()
      const expireDate =
        typeof orgPlan?.expires_at === 'string'
          ? new Date(orgPlan.expires_at)
          : orgPlan?.expires_at || now

      const diff = expireDate.getTime() - now.getTime()
      if (diff <= 0) {
        setMonths(0)
        setDays(0)
        return
      }

      const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24))
      setMonths(Math.floor(totalDays / 30))
      setDays(totalDays % 30)
    }

    updateTimeLeft() // Initialize immediately
    const interval = setInterval(updateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [orgPlan?.expires_at])

  const handleClick = useCallback(() => {
    const linkKey = currentInsight?.buttonLink || ''
    router.push(t(linkKey) || 'https://li2.ai/vi/support')
  }, [router, currentInsight?.buttonLink, t])

  const capitalizedPlan =
    orgPlan && orgPlan?.name?.charAt(0).toUpperCase() + orgPlan?.name?.slice(1).toLowerCase()

  return (
    <div
      className={cn(
        'flex md:flex-row flex-col px-6 py-6 items-center justify-between gap-6 self-stretch h-full rounded-[16px]',
        'bg-cover bg-no-repeat bg-center'
      )}
      style={{
        ...(currentInsight?.bgImageCss || {}),
        ...(currentInsight?.bgImage ? { backgroundImage: `url('${currentInsight.bgImage}')` } : {}),
      }}
    >
      {currentInsight?.hasNoise && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "url('/images/home_page/noise.png') lightgray 0% 0% / 100px 100px repeat",
            opacity: 1,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      <div className="flex flex-col items-start gap-4 flex-1">
        <div className="flex flex-col gap-2 self-stretch">
          <span className="text-black text-lg font-semibold leading-[24px]">
            {t(currentInsight?.title)}
          </span>
          <span className="text-black text-sm font-medium leading-[20px]">
            <Trans i18nKey={t(currentInsight?.description)} components={{ br: <br /> }} />
            {orgPlan?.expires_at && <> {expiryDate}</>}
          </span>
        </div>

        <div className="flex flex-col gap-2 self-stretch">
          {currentInsight?.insight.map((item: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <CheckIcon className="w-5 h-5 min-w-[20px] min-h-[20px]" />
              <span className="text-guest-primary-dark text-base font-normal">{t(item)}</span>
            </div>
          ))}
        </div>

        {currentInsight?.button && t(currentInsight.button).length > 2 && (
          <div className="flex gap-2 w-full">
            {currentInsight?.buttonLink ? (
              <Button
                type="button"
                onClick={handleClick}
                className="flex items-center gap-1"
                iconLeft={<Sparkles size={18} />}
              >
                <span className="text-sm font-normal group-hover:text-black">
                  {t(currentInsight.button)}
                </span>
              </Button>
            ) : (
              <CustomToolTip delayDuration={100} content="Coming soon">
                <Button
                  type="button"
                  disabled
                  className="flex items-center gap-1"
                  iconLeft={<Sparkles size={18} />}
                >
                  <span className="text-sm font-normal group-hover:text-black">
                    {t(currentInsight.button)}
                  </span>
                </Button>
              </CustomToolTip>
            )}
          </div>
        )}
      </div>

      <div
        className="md:flex hidden bg-cover bg-no-repeat bg-center rounded-[16px] relative justify-center items-center lg:w-[327px] w-[250px] z-50"
        style={{
          ...currentInsight?.iconLayerBehindImgCss,
          borderRadius: '16px',
          backgroundImage: `url('${currentInsight?.iconLayerBehindImg || ''}')`,
        }}
      >
        {currentInsight?.iconLayerFrontImgClass && (
          <div
            className={cn(currentInsight?.iconLayerFrontImgClass)}
            style={{
              width: currentInsight?.iconLayerFrontImgWidthHeight?.width ?? 266,
              height: currentInsight?.iconLayerFrontImgWidthHeight?.height ?? 286,
              backgroundImage: `url('${currentInsight?.iconLayerFrontImg || ''}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}
      </div>
    </div>
  )
}

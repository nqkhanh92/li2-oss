'use client'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { Button } from '@/shared/components/ui/button'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { usePlanProvider } from '@/shared/providers/plan-provider'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useTranslation } from 'react-i18next'
export default function AppsPage() {
  const { plan } = usePlanProvider()
  const router = useRouter()

  const searchParams = useSearchParams()

  useEffect(() => {
    const just_logged_in = searchParams.get('just_logged_in')
    if (just_logged_in) {
      sendGAEvent('event', 'user_id', { value: plan?.user_id })
    }
  }, [searchParams])

  const handleParcelvoy = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/parcelvoy'
    }
  }, [])
  const handleSelectApp = () => {
    router.push('/org')
  }
  const { t } = useTranslation(['apps'])
  return (
    <div className="w-full h-screen flex items-center justify-center bg-neutral-400 overflow-y-scroll">
      <div className="space-y-9 flex flex-col items-center px-4 h-full lg:justify-center">
        <p className="text-[20px] font-semibold">{t('title')}</p>
        <div className="lg:flex space-y-4 gap-9 items-center justify-center">
          <div className="p-6 gap-6 flex flex-col bg-background rounded-[16px] justify-center items-center lg:w-[440px]">
            <div
              style={{
                height: '200px',
                width: '100%',
                display: 'inline-block',
                position: 'relative',
              }}
            >
              <Image
                src="/images/select-apps/app.svg"
                alt={t('appName')}
                height={200}
                width={0} // This is ignored when using style below
                style={{
                  height: '200px',
                  width: '100%',
                  objectFit: 'cover',
                }}
                unoptimized // since this is a remote image and we're bypassing Next optimization
              />
            </div>
            <div className="text-center">
              <h2 className="text-[18px] font-semibold">{t('appName')}</h2>
              <p className="text-[16px] font-medium text-slate-700 leading-[24px] tracking-[0.024px]">
                {t('app_desc')}
              </p>
            </div>
            <Button onClick={handleSelectApp}>{t('app_button')}</Button>
          </div>
          <div className="p-6 gap-6 flex flex-col bg-background rounded-[16px] justify-center items-center lg:w-[440px]">
            <div
              style={{
                height: '200px',
                width: '100%',
                display: 'inline-block',
                position: 'relative',
              }}
            >
              <Image
                src="/images/select-apps/parcelvoy.svg"
                alt="Parcelvoy"
                height={200}
                width={0} // This is ignored when using style below
                style={{
                  height: '200px',
                  width: '100%',
                  objectFit: 'cover',
                }}
                unoptimized // since this is a remote image and we're bypassing Next optimization
              />
            </div>
            <div className="text-center">
              <h2 className="text-[18px] font-semibold">{t('parcelvoy')}</h2>
              <p className="text-[16px] font-medium text-slate-700 leading-[24px] tracking-[0.024px]">
                {t('parcelvoy_desc')}
              </p>
            </div>
            <TooltipProvider delayDuration={0}>
              <LockableSection
                lockBy="plan"
                locked={plan?.plans?.max_integrations_per_org === 0}
                variant="hover"
                lockText="This feature only available for Plus plan or above"
              >
                <div className="flex items-center justify-center">
                  <Button onClick={handleParcelvoy}>{t('parcelvoy_button')}</Button>
                </div>
              </LockableSection>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  )
}

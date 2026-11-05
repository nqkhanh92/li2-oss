'use client'

import { Button } from '@/shared/components/ui/button'
import { HomeIcon } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation('common')
  const router = useRouter()

  useEffect(() => {
    document.cookie = 'slugMapping=; path=/; max-age=0; SameSite=Lax'
  }, [])

  return (
    <div className="h-screen overflow-y-auto bg-slate-100 px-4">
      <div className="min-h-full flex flex-col items-center justify-center py-12">
        <div className="bg-white border border-slate-200 rounded-[8px] shadow-[0px_3px_10px_rgba(0,0,0,0.1),0px_2px_4px_rgba(0,0,0,0.08)] flex flex-col gap-6 items-center p-9 w-full max-w-[450px] text-center">
          <Image
            src="/images/li2-logo-withtext-black.svg"
            alt="Li2.ai"
            width={120}
            height={30}
            priority
          />

          <div className="flex flex-col gap-2">
            <p className="text-[72px] font-black text-slate-200 leading-none select-none">404</p>
            <p className="text-xl font-semibold leading-7 text-slate-700">
              {t('not_found_page.title')}
            </p>
            <p className="text-s leading-5 text-slate-500">
              {t('not_found_page.description')}
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              className="w-1/4"
              onClick={() => router.back()}
            >
              {t('not_found_page.back')}
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full" variant="default">
                <HomeIcon className="mr-2 h-4 w-4" />
                {t('not_found_page.go_home')}
              </Button>
            </Link>
          </div>

          <p className="text-xs text-slate-400">
            {t('not_found_page.support_hint')}{' '}
            <a
              href="https://li2.ai/support"
              className="text-slate-500 underline hover:text-slate-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('not_found_page.support_link')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

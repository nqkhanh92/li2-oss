'use client'

import { Plus, Link2, MousePointerClick, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'

function MockLinkCard({ clicks }: { clicks: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
        <Link2 className="w-4 h-4 text-primary/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="h-2 w-24 rounded bg-slate-800/70 mb-1.5" />
        <div className="h-1.5 w-32 rounded bg-slate-300/80" />
      </div>
      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium shrink-0">
        <MousePointerClick className="w-3 h-3" />
        <span>{clicks}</span>
      </div>
    </div>
  )
}

export function ShortLinkEmptyState() {
  const { t } = useTranslation('touchpoint')
  const { orgRouterPush } = useOrganizationStoreProvider()

  return (
    <div className="flex flex-col items-center pt-6 pb-14">
      {/* Illustration */}
      <div className="relative w-full max-w-[480px] mx-auto mb-8 animate-[fadeSlideUp_0.6s_ease-out_both]">
        <div className="absolute inset-0 -inset-x-8 -inset-y-4 bg-gradient-to-b from-violet-100/40 via-blue-50/20 to-transparent rounded-3xl blur-2xl" />

        <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            </div>
            <div className="flex-1 mx-3 h-5 rounded-md bg-slate-100 flex items-center px-2 gap-1">
              <Link2 className="w-2.5 h-2.5 text-slate-400" />
              <div className="h-1.5 w-20 rounded bg-slate-300" />
            </div>
          </div>

          {/* Mock link cards */}
          <div className="flex flex-col gap-2.5 p-4 animate-[fadeSlideUp_0.5s_ease-out_0.2s_both]">
            <MockLinkCard clicks="1.2k" />
            <MockLinkCard clicks="843" />
            <MockLinkCard clicks="327" />
          </div>

          {/* Mock analytics bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/40 animate-[fadeSlideUp_0.5s_ease-out_0.4s_both]">
            <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex gap-1.5 flex-1">
              {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-secondary/30"
                  style={{ height: `${h * 0.2}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Text + CTA */}
      <div className="flex flex-col items-center text-center max-w-sm animate-[fadeSlideUp_0.5s_ease-out_0.3s_both]">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t('touchpoint:short_link_list.empty.title')}
        </h2>
        <p className="text-s text-slate-500 leading-relaxed mb-6">
          {t('touchpoint:short_link_list.empty.description')}
        </p>
        <Button
          size="default"
          iconLeft={<Plus className="h-4 w-4" />}
          onClick={() => orgRouterPush('/short-links/create')}
        >
          {t('touchpoint:short_link_list.empty.cta')}
        </Button>
      </div>

      <style jsx global>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

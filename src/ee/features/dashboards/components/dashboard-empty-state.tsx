'use client'

import { useTranslation } from 'react-i18next'
import { Plus, TrendingUp, Users, MousePointerClick } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface DashboardEmptyStateProps {
  onCreateClick: () => void
}

/* ── Mini chart SVGs for the dashboard mockup ──────────────────── */

function MiniBarChart() {
  return (
    <svg viewBox="0 0 120 48" className="w-full h-full" aria-hidden>
      <rect x="4" y="32" width="12" height="16" rx="2" className="fill-emerald-300/80" />
      <rect x="20" y="20" width="12" height="28" rx="2" className="fill-emerald-400/80" />
      <rect x="36" y="26" width="12" height="22" rx="2" className="fill-emerald-300/80" />
      <rect x="52" y="12" width="12" height="36" rx="2" className="fill-emerald-500/80" />
      <rect x="68" y="18" width="12" height="30" rx="2" className="fill-emerald-400/80" />
      <rect x="84" y="8" width="12" height="40" rx="2" className="fill-emerald-500/80" />
      <rect x="100" y="4" width="12" height="44" rx="2" className="fill-emerald-600/80" />
    </svg>
  )
}

function MiniLineChart() {
  return (
    <svg viewBox="0 0 120 48" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,36 Q20,32 30,28 T60,18 T90,22 T120,8"
        fill="none"
        stroke="rgb(56 189 248)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M0,36 Q20,32 30,28 T60,18 T90,22 T120,8 L120,48 L0,48 Z" fill="url(#lineGrad)" />
    </svg>
  )
}

function MiniDonut() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden>
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke="rgb(248 113 113)"
        strokeWidth="6"
        strokeDasharray="70 113"
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke="rgb(251 191 36)"
        strokeWidth="6"
        strokeDasharray="30 113"
        strokeDashoffset="-70"
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke="rgb(167 139 250)"
        strokeWidth="6"
        strokeDasharray="13 113"
        strokeDashoffset="-100"
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
    </svg>
  )
}

/* ── Main empty state ──────────────────────────────────────────── */

export function DashboardEmptyState({ onCreateClick }: DashboardEmptyStateProps) {
  const { t } = useTranslation('dashboards')

  return (
    <div className="flex flex-col items-center pt-4 pb-12">
      <div className="relative w-full max-w-[600px] mx-auto mb-8 animate-[fadeSlideUp_0.6s_ease-out_both]">
        <div className="absolute inset-0 -inset-x-8 -inset-y-4 bg-gradient-to-b from-sky-100/50 via-emerald-50/30 to-transparent rounded-3xl blur-2xl" />

        <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            </div>
            <div className="h-2 w-24 rounded bg-slate-200 ml-2" />
            <div className="ml-auto h-2 w-16 rounded bg-slate-200" />
          </div>

          <div className="grid grid-cols-3 gap-3 p-4">
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-3 animate-[fadeSlideUp_0.5s_ease-out_0.2s_both]">
              <div className="flex items-center justify-between mb-2">
                <div className="h-1.5 w-10 rounded bg-slate-200" />
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              </div>
              <div className="h-3 w-14 rounded bg-slate-800/80 mb-1" />
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-6 rounded bg-emerald-200" />
                <span className="text-[8px] text-emerald-500 font-medium">+12%</span>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-3 animate-[fadeSlideUp_0.5s_ease-out_0.3s_both]">
              <div className="flex items-center justify-between mb-2">
                <div className="h-1.5 w-8 rounded bg-slate-200" />
                <Users className="h-3 w-3 text-sky-400" />
              </div>
              <div className="h-3 w-10 rounded bg-slate-800/80 mb-1" />
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-8 rounded bg-sky-200" />
                <span className="text-[8px] text-sky-500 font-medium">+8%</span>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-3 animate-[fadeSlideUp_0.5s_ease-out_0.4s_both]">
              <div className="flex items-center justify-between mb-2">
                <div className="h-1.5 w-12 rounded bg-slate-200" />
                <MousePointerClick className="h-3 w-3 text-violet-400" />
              </div>
              <div className="h-3 w-12 rounded bg-slate-800/80 mb-1" />
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-5 rounded bg-violet-200" />
                <span className="text-[8px] text-violet-500 font-medium">+24%</span>
              </div>
            </div>

            <div className="col-span-2 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-3 animate-[fadeSlideUp_0.5s_ease-out_0.5s_both]">
              <div className="h-1.5 w-16 rounded bg-slate-200 mb-3" />
              <div className="h-16">
                <MiniBarChart />
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-3 flex flex-col items-center animate-[fadeSlideUp_0.5s_ease-out_0.55s_both]">
              <div className="h-1.5 w-10 rounded bg-slate-200 mb-2 self-start" />
              <div className="w-12 h-12">
                <MiniDonut />
              </div>
            </div>

            <div className="col-span-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-3 animate-[fadeSlideUp_0.5s_ease-out_0.65s_both]">
              <div className="flex items-center justify-between mb-2">
                <div className="h-1.5 w-20 rounded bg-slate-200" />
                <div className="flex gap-2">
                  <div className="h-1.5 w-6 rounded bg-sky-200" />
                  <div className="h-1.5 w-6 rounded bg-slate-200" />
                </div>
              </div>
              <div className="h-12">
                <MiniLineChart />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center text-center max-w-md animate-[fadeSlideUp_0.5s_ease-out_0.4s_both]">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t('list.empty.title', { defaultValue: 'Your command center awaits' })}
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          {t('list.empty.description', {
            defaultValue:
              'Combine clicks, conversions, and visitor insights into one view. Build your first dashboard in under a minute.',
          })}
        </p>
        <Button size="lg" onClick={onCreateClick} iconLeft={<Plus className="h-4 w-4" />}>
          {t('list.newDashboard', { defaultValue: 'New Dashboard' })}
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

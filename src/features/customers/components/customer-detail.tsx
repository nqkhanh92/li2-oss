'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, User, MousePointer, AlertCircle, ArrowLeft, Link2 } from 'lucide-react'
import Link from 'next/link'
import { useGetCustomerById, useGetCustomerJourney } from '../hooks/queries'
import { useOrganizationCurrency, useExchangeRate } from '@/shared/lib/currency'
import { CustomerLocationDisplay } from './customer-location-display'
import { CustomerDeviceInfo } from './customer-device-info'
import { CustomerUtmDisplay } from './customer-utm-display'
import { CustomerStatsCards } from './customer-stats-cards'
import { CustomerJourneyTimeline } from './customer-journey-timeline'
import { CustomerConversionHistory } from './customer-conversion-history'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-6">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

function CustomerNotFound() {
  const { t } = useTranslation('customers')
  const router = useRouter()
  const { org_id } = useParams<{ org_id: string }>()

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
        <div className="relative p-6 rounded-full bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t('detail.not_found', 'Customer not found')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          {t(
            'detail.not_found_desc',
            'The customer you are looking for does not exist or has been deleted.'
          )}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => router.push(`/org/${org_id}/customers`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('detail.back_to_list', 'Back to customers')}
      </Button>
    </div>
  )
}

export function CustomerDetail() {
  const { t } = useTranslation('customers')
  const { org_id, customer_id } = useParams<{ org_id: string; customer_id: string }>()

  const { data: customer, isLoading } = useGetCustomerById(org_id, customer_id)
  const { data: journey, isLoading: journeyLoading } = useGetCustomerJourney(org_id, customer_id)

  const defaultCurrency = useOrganizationCurrency()
  const { data: usdToVndRate = 1 } = useExchangeRate('USD', 'VND')

  if (isLoading) {
    return <CustomerDetailSkeleton />
  }

  if (!customer) {
    return <CustomerNotFound />
  }

  const firstVisit = journey?.firstVisit
  const hasFirstVisitInfo =
    firstVisit &&
    (firstVisit.country ||
      firstVisit.city ||
      firstVisit.userAgent ||
      firstVisit.os ||
      firstVisit.utmTags ||
      firstVisit.referrer)

  const customerName = customer.name || customer.email || t('detail.anonymous', 'Anonymous')
  const initials = customerName.slice(0, 2).toUpperCase()

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-slate-50 to-secondary-cyan/10 dark:from-primary/10 dark:via-slate-900 dark:to-secondary-cyan/5 border border-slate-200/80 dark:border-slate-700/50">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-secondary-cyan/20 to-transparent rounded-full blur-2xl" />
        </div>

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary-purple rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary-light to-secondary-purple text-white shadow-lg">
                <span className="text-2xl font-bold tracking-tight">{initials}</span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {customerName}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    {t('detail.customer_since', 'Customer since {{date}}', {
                      date: new Date(customer.created_at).toLocaleDateString(),
                    })}
                  </span>
                  {customer.external_id && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-500 dark:text-slate-500">
                      External ID: {customer.external_id}
                    </span>
                  )}
                  {customer.is_anonymous && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-xs font-medium text-amber-700 dark:text-amber-400">
                      {t('detail.anonymous_badge', 'Anonymous')}
                    </span>
                  )}
                  {customer.merged_from_ids && customer.merged_from_ids.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-400">
                      {t('detail.merged_badge', 'Merged from {{count}} profile(s)', {
                        count: customer.merged_from_ids.length,
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Customer Metadata */}
              {customer.metadata && Object.keys(customer.metadata).length > 0 && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t('detail.metadata', 'Metadata')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(customer.metadata).map(([key, value]) => {
                      const valueString =
                        typeof value === 'object' ? JSON.stringify(value) : String(value)
                      return (
                        <div
                          key={key}
                          className="inline-flex items-start gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                        >
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {key}:
                          </span>
                          <span
                            title={valueString}
                            className="text-xs text-slate-700 dark:text-slate-300 break-all min-w-0 truncate max-w-24"
                          >
                            {valueString}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quick Contact */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors group"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="truncate max-w-[200px] group-hover:underline">
                      {customer.email}
                    </span>
                  </a>
                )}
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors group"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="group-hover:underline">{customer.phone}</span>
                  </a>
                )}
                {customer.touch_points ? (
                  <Link
                    href={`/org/${org_id}/short-links/${customer.touch_points.id}`}
                    className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors group"
                  >
                    <Link2 className="h-4 w-4" />
                    <span className="flex flex-col">
                      <span className="truncate max-w-[180px] group-hover:underline">
                        {customer.touch_points.name}
                      </span>
                      {customer.touch_points.short_url && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                          {customer.touch_points.short_url}
                        </span>
                      )}
                    </span>
                  </Link>
                ) : (
                  <Badge variant="outline" size="sm">Direct</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column - Customer Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* First Visit Info Card */}
          {hasFirstVisitInfo && (
            <div
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500"
              style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
            >
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('detail.sections.first_visit', 'First Visit Information')}
                </h3>
              </div>
              <div className="p-5 space-y-5">
                <CustomerLocationDisplay
                  country={firstVisit.country}
                  city={firstVisit.city}
                  region={firstVisit.region}
                />
                <CustomerDeviceInfo
                  userAgent={firstVisit.userAgent}
                  os={firstVisit.os}
                  platform={firstVisit.platform}
                />
                <CustomerUtmDisplay utmTags={firstVisit.utmTags} referrer={firstVisit.referrer} />
              </div>
            </div>
          )}

          {/* No first visit - show empty state */}
          {!hasFirstVisitInfo && !journeyLoading && (
            <div
              className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 p-6 animate-in fade-in slide-in-from-left-4 duration-500"
              style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
            >
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <MousePointer className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('detail.no_visit_info', 'No visit information')}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {t('detail.direct_conversion', 'This customer converted directly')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stats & Timeline */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats Cards - Featured prominently */}
          <div
            className="animate-in fade-in slide-in-from-right-4 duration-500"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            <CustomerStatsCards
              customer={customer}
              metrics={journey?.metrics ?? null}
              defaultCurrency={defaultCurrency}
              usdToVndRate={usdToVndRate}
              isLoading={journeyLoading}
            />
          </div>

          {/* Journey Timeline */}
          <div
            className="animate-in fade-in slide-in-from-right-4 duration-500"
            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
          >
            <CustomerJourneyTimeline customerId={customer.id} defaultCurrency={defaultCurrency} />
          </div>

          {/* Conversion History */}
          <div
            className="animate-in fade-in slide-in-from-right-4 duration-500"
            style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
          >
            <CustomerConversionHistory customerId={customer.id} defaultCurrency={defaultCurrency} />
          </div>
        </div>
      </div>
    </div>
  )
}

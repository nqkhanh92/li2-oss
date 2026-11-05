'use client'

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { Users, TrendingUp, ShoppingCart, DollarSign, Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { ConversionFunnelChart } from './funnel-chart'
import { FunnelStage } from '../types'

const MOCK_STAGES: FunnelStage[] = [
  { name: 'Clicks', value: 8420, fill: '#3aaae3' },
  { name: 'Leads', value: 1253, fill: '#3762d0' },
  { name: 'Sales', value: 312, fill: '#150f5a' },
]

const MOCK_CONVERSION_RATES = { clicksToLeads: 14.9, leadsToSales: 24.9, overall: 3.7 }

const MOCK_EVENTS = [
  { id: '1', event_name: 'form_submit', type: 'lead', customer: 'alice@example.com', touchpoint: 'Homepage CTA', amount: null, time: '2 hours ago' },
  { id: '2', event_name: 'purchase', type: 'sale', customer: 'bob@example.com', touchpoint: 'Pricing Page', amount: '$149', time: '4 hours ago' },
  { id: '3', event_name: 'form_submit', type: 'lead', customer: 'carol@example.com', touchpoint: 'Blog Post', amount: null, time: '6 hours ago' },
  { id: '4', event_name: 'purchase', type: 'sale', customer: 'dave@example.com', touchpoint: 'Retargeting Ad', amount: '$299', time: '8 hours ago' },
  { id: '5', event_name: 'contact_request', type: 'lead', customer: 'eve@example.com', touchpoint: 'Homepage CTA', amount: null, time: '10 hours ago' },
]


export function ConversionsDemo() {
  const { t } = useTranslation('conversions')

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('stats.totalCustomers', 'Total Customers'), value: '1,253', icon: Users, color: 'text-secondary-dark-cyan' },
          { label: t('stats.totalLeads', 'Total Leads'), value: '1,253', icon: TrendingUp, color: 'text-secondary-orange' },
          { label: t('stats.totalSales', 'Total Sales'), value: '312', icon: ShoppingCart, color: 'text-secondary-purple' },
          { label: t('stats.totalRevenue', 'Total Revenue'), value: '$48,620', icon: DollarSign, color: 'text-secondary-blue' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className="flex gap-4 items-center">
                <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-[42px]">
                  <Icon className={`size-7 ${color}`} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-base text-slate-500">{label}</p>
                  <p className="text-xl font-medium text-slate-700">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel */}
      <ConversionFunnelChart
        data={MOCK_STAGES}
        conversionRates={MOCK_CONVERSION_RATES}
        selectedStage={null}
        setSelectedStage={() => {}}
      />

      {/* Conversions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('events.title', 'Conversion Events')}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('events.searchPlaceholder', 'Search by email or name...')}
                className="pl-8"
                readOnly
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('events.columns.eventName', 'Event Name')}</TableHead>
                <TableHead>{t('events.columns.customer', 'Customer')}</TableHead>
                <TableHead>{t('events.columns.touchPoint', 'Link')}</TableHead>
                <TableHead>{t('events.columns.type', 'Type')}</TableHead>
                <TableHead>{t('events.columns.amount', 'Amount')}</TableHead>
                <TableHead>{t('events.columns.createdAt', 'Created At')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_EVENTS.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.event_name}</TableCell>
                  <TableCell className="text-primary">{event.customer}</TableCell>
                  <TableCell>{event.touchpoint}</TableCell>
                  <TableCell>
                    <Badge variant={event.type === 'sale' ? 'default' : 'secondary'}>
                      {event.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{event.amount ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{event.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

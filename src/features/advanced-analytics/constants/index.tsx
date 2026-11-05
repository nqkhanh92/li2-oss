import { Stats } from '@/core/types/analytics/stats-panel.type'
import {
  GitBranch,
  Link,
  Megaphone,
  MousePointer,
  QrCode,
  Smartphone,
  TrendingUp,
  Wifi,
} from 'lucide-react'

export type Channel = {
  key: Extract<keyof Stats, 'link_clicks' | 'qr_scans' | 'nfc_taps' | 'wifi_accesses'>
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export const channels: Channel[] = [
  {
    key: 'link_clicks',
    name: 'Links',
    icon: Link,
    color: 'text-purple-600',
  },
  {
    key: 'qr_scans',
    name: 'QR Codes',
    icon: QrCode,
    color: 'text-orange-600',
  },
  {
    key: 'nfc_taps',
    name: 'NFC Taps',
    icon: Smartphone,
    color: 'text-indigo-600',
  },
  {
    key: 'wifi_accesses',
    name: 'WiFi Access',
    icon: Wifi,
    color: 'text-teal-600',
  },
]

export const COLOR_CLASSES = {
  green: { bg: 'bg-green-500', text: 'text-green-800', desc: 'text-green-700' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-800', desc: 'text-yellow-700' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-800', desc: 'text-blue-700' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-800', desc: 'text-purple-700' },
} as const

export const timePeriods: { value: number; label: string; premium?: boolean }[] = [
  { value: 7, label: 'Last 7 days', premium: false },
  { value: 30, label: 'Last 30 days', premium: true },
  { value: 90, label: 'Last 90 days', premium: true },
  { value: 180, label: 'Last 180 days', premium: true },
]

export const filterOptions = [
  { value: 'tags', label: 'By Tags' },
  { value: 'touchpoints', label: 'By Touch Point' },
]

export const subTabs = [
  {
    id: 'traffic-sources',
    label: 'Traffic Sources',
    icon: MousePointer,
    description: 'Source analysis & quality metrics',
  },
  {
    id: 'campaigns',
    label: 'Campaign Performance',
    icon: Megaphone,
    description: 'UTM tracking & campaign ROI',
    comingSoon: false,
  },
  {
    id: 'attribution',
    label: 'Channel Attribution',
    icon: GitBranch,
    description: 'Multi-touch attribution models',
    comingSoon: false,
  },
  {
    id: 'trends',
    label: 'Growth & Trends',
    icon: TrendingUp,
    description: 'Time-series & forecasting',
    comingSoon: true,
  },
]

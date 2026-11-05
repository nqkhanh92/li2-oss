'use client'
import { Row } from '@tanstack/react-table'
import {
  CopyIcon,
  SquareArrowOutUpRight,
  ScanEye,
  Folder,
  Tag as TagIcon,
  TrendingUp,
  LocateFixed,
  CodeXml,
  Lock,
  Shield,
  Timer,
  FileWarning,
  EyeOff,
  Megaphone,
  UserRoundCheck,
  CircleDollarSign,
  ChartNoAxesCombined,
  Eye,
  ChartNoAxesColumnIncreasing,
  MoveRight,
} from 'lucide-react'
import {
  FacebookIcon,
  TikTokIcon,
} from '@/features/short-links/components/short-link-form/short-link-form.icons'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Badge } from '@/shared/components/ui/badge'
import { SafetyFlaggedBadge } from '../../../touch-points/components/safety-flagged-badge'
import dayjs from '@/shared/lib/dayjs'
import { useGetTouchPoints } from '@/features/touch-points/hooks/queries'
import { useTouchPointActions } from '../../../touch-points/hooks/use-touchpoint-actions'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { DataTableRowActions } from '@/shared/components/customize/table/data-table-row-action'
import { CustomAvatar } from '@/shared/components/ui/custom-avatar'
import { RelativeTime } from '@/shared/components/ui/relative-time'
import { useTranslation } from 'react-i18next'
import { useAgentChatContextOptional } from '@/shared/providers/agent-chat-provider'
import { cn } from '@/shared/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ArtifactAccessBadge } from '@/features/artifacts/components/artifact-access-badge'
import {
  ArtifactStatusBadge,
  ArtifactStatusNote,
} from '@/features/artifacts/components/artifact-status-badge'
import type { TouchPointArtifactMeta } from '@/core/types/touch-point.type'
import {
  getRowDestination,
  getRowKind,
  getRowStatusBadge,
  getRowKindTileClass,
  getRowEditPath,
  stripProtocol,
} from '@/features/short-links/utils/row-kind'
import { RowAvatar } from './row-avatar'
import {
  useOrganizationCurrency,
  useExchangeRate,
  formatCurrencyFromCents,
} from '@/shared/lib/currency'

export type TouchPointData = NonNullable<
  ReturnType<typeof useGetTouchPoints>['data']
>['data'][number]

/**
 * Touchpoint enabled-feature flags → icon mapping.
 *
 * conversionTracking → conversion_tracking?.enabled
 * targeting          → targeting?.enabled
 * redirectSetting    → redirect_setting?.enabled
 * accessControl      → access_control?.enabled
 * tracking           → tracking?.enabled
 * privacySecurity    → privacy_security?.enabled
 * linkExpiration     → link_expiration?.enabled
 * custom404Redirect  → custom_404_redirect?.enabled
 * linkCloaking       → link_cloaking?.enabled
 */
export interface TouchPointFeatureFlags {
  conversionTracking: boolean
  targeting: boolean
  redirectSetting: boolean
  accessControl: boolean
  fbPixel: boolean
  gaTracking: boolean
  tiktokPixel: boolean
  privacySecurity: boolean
  linkExpiration: boolean
  custom404Redirect: boolean
  linkCloaking: boolean
}

const FEATURE_ICON_MAP: {
  key: keyof TouchPointFeatureFlags
  Icon: React.ElementType
  tKey: string
}[] = [
  {
    key: 'conversionTracking',
    Icon: TrendingUp,
    tKey: 'touch_point_list_v2.features.conversion_tracking',
  },
  { key: 'targeting', Icon: LocateFixed, tKey: 'touch_point_list_v2.features.targeting' },
  { key: 'redirectSetting', Icon: CodeXml, tKey: 'touch_point_list_v2.features.redirect_rules' },
  { key: 'accessControl', Icon: Lock, tKey: 'touch_point_list_v2.features.access_control' },
  { key: 'fbPixel', Icon: FacebookIcon, tKey: 'touch_point_list_v2.features.fb_pixel' },
  {
    key: 'gaTracking',
    Icon: ChartNoAxesColumnIncreasing,
    tKey: 'touch_point_list_v2.features.ga_tracking',
  },
  { key: 'tiktokPixel', Icon: TikTokIcon, tKey: 'touch_point_list_v2.features.tiktok_pixel' },
  {
    key: 'privacySecurity',
    Icon: Shield,
    tKey: 'touch_point_list_v2.features.privacy_security',
  },
  { key: 'linkExpiration', Icon: Timer, tKey: 'touch_point_list_v2.features.link_expiration' },
  {
    key: 'custom404Redirect',
    Icon: FileWarning,
    tKey: 'touch_point_list_v2.features.custom_404_redirect',
  },
  { key: 'linkCloaking', Icon: EyeOff, tKey: 'touch_point_list_v2.features.link_cloaking' },
]

// UTM field definitions (ordered by display priority)
const UTM_FIELDS = [
  { key: 'utm_campaign', tKey: 'touch_point_list_v2.utm_fields.campaign' },
  { key: 'utm_source', tKey: 'touch_point_list_v2.utm_fields.source' },
  { key: 'utm_medium', tKey: 'touch_point_list_v2.utm_fields.medium' },
  { key: 'utm_term', tKey: 'touch_point_list_v2.utm_fields.term' },
  { key: 'utm_content', tKey: 'touch_point_list_v2.utm_fields.content' },
] as const

function getActiveUtms(
  utmTags: Record<string, any> | null | undefined,
  t: (key: string) => string
) {
  if (!utmTags?.enabled) return []
  return UTM_FIELDS.filter((f) => utmTags[f.key]).map((f) => ({
    key: f.key,
    label: t(f.tKey),
    value: utmTags[f.key] as string,
  }))
}

const TooltipList = ({ items }: { items: { label: string; value: string }[] }) => (
  <div className="flex flex-col gap-1.5">
    {items.map((item, i) => (
      <div key={i} className="flex items-center gap-2">
        <span className="text-xs text-slate-400 w-16 shrink-0">{item.label}</span>
        <span className="text-xs font-medium text-slate-700 truncate">{item.value}</span>
      </div>
    ))}
  </div>
)

interface TouchPointCardProps {
  row: Row<TouchPointData>
  featureFlags: TouchPointFeatureFlags
}

export const TouchPointCard = ({ row, featureFlags }: TouchPointCardProps) => {
  const data = row.original
  const { handleCopy } = useTouchPointActions(data as any)
  const { t } = useTranslation(['touchpoint', 'common', 'artifact'])
  const { t: tAgent } = useTranslation('agent-chat')
  /**
   * Hàng này có phải thứ trợ lý vừa tạo trong phiên trình duyệt này không.
   *
   * Đọc từ `AgentChatProvider` — provider nhúng ở layout org nên luôn có mặt ở đây. Danh sách chỉ
   * ĐỌC, không ghi: thứ tự và dữ liệu vẫn do truy vấn quyết định, nhãn chỉ là một lớp phủ.
   */
  const agentChat = useAgentChatContextOptional()
  const justCreatedByChat = agentChat?.createdLinkIds.includes(data.id) ?? false

  const rowKind = getRowKind(data as any)
  const destination = getRowDestination(data as any)
  const statusBadge = getRowStatusBadge(data as any)
  const artifact = (data as any).artifact as TouchPointArtifactMeta | null | undefined

  // UTM
  const activeUtms = getActiveUtms((data as any).utm_tags, t)
  // Tags
  const visibleTags = data.tp_tag_links.slice(0, 2)
  const hiddenTags = data.tp_tag_links.slice(2)

  const { orgRouterPush } = useOrganizationStoreProvider()

  const defaultCurrency = useOrganizationCurrency()
  const { data: usdToVndRate = 1 } = useExchangeRate('USD', 'VND')
  const conversionSummary = (data as any).conversion_summary
  const usdCents = conversionSummary?.total_revenue_usd || 0
  const vndDong = conversionSummary?.total_revenue_vnd || 0
  const displayRevenue =
    defaultCurrency === 'USD'
      ? usdCents + (usdToVndRate > 0 ? Math.round((vndDong / usdToVndRate) * 100) : 0)
      : vndDong + Math.round((usdCents / 100) * usdToVndRate)

  return (
    <div
      /* Bấm vào hàng đi tới trang của ĐÚNG LOẠI: artifact mở trang artifact, link mở trang short
         link. Dùng chung `getRowEditPath` với menu "Sửa" — hai chỗ đi hai nơi khác nhau cho cùng
         một hàng là cách chắc chắn làm người dùng mất phương hướng. */
      onClick={() => orgRouterPush(getRowEditPath(data as any))}
      className={cn(
        'flex items-center gap-2 bg-card border border-slate-300 rounded-[8px] p-3 md:pl-2 md:pr-4 md:py-4 w-full min-w-0 overflow-hidden cursor-pointer hover:border-primary transition-colors',
        row.getIsSelected() && 'bg-neutral-50',
        /* Viền xanh cho hàng vừa được trợ lý tạo trong phiên này — xem `justCreatedByChat`. */
        justCreatedByChat && 'border-[#8FD1A6] border-[1.5px]'
      )}
    >
      {/* Checkbox */}
      <div
        className="flex items-center justify-center px-1 md:px-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      </div>

      {/* Ô tròn đầu hàng — favicon cho link, biểu tượng loại cho artifact. Thay ô QR 90×90; lý do
          và chỗ "Tải QR" còn lại nằm trong `row-avatar.tsx`. */}
      <RowAvatar
        kind={rowKind}
        destinationUrl={rowKind.family === 'url' ? data.content_value : null}
      />


      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0 md:px-2">
        <div className="flex gap-2 min-w-0">
          <div className="flex flex-1 flex-col min-w-0 gap-0.5">
            {/* Row 0: type tile + name. The tile is what tells a link apart from an artifact —
                before it existed this list showed both and labelled every row "LINK". */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                data-testid="row-kind-tile"
                title={rowKind.label}
                className={cn(
                  'shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold leading-4',
                  getRowKindTileClass(rowKind)
                )}
              >
                {rowKind.label}
              </span>
              {/*
                Nhãn "Vừa tạo qua chat".
                Bảng này có thể dài hàng trăm hàng, nên thứ vừa nhờ trợ lý tạo cần tự chỉ ra mình
                ở đâu — nếu không, người dùng phải đi dò đúng cái họ vừa yêu cầu.
              */}
              {justCreatedByChat && (
                <span className="shrink-0 rounded-[6px] bg-[#E6F4EA] px-1.5 py-0.5 text-[10px] font-bold leading-4 text-[#1B6B3D]">
                  {tAgent('justCreatedByChat')}
                </span>
              )}
              {data.name && (
                <p className="text-sm font-medium text-foreground truncate min-w-0">{data.name}</p>
              )}
              {artifact && <ArtifactAccessBadge mode={artifact.access_mode} />}
              {/* Quyết định hiện hay không nằm ở `getRowStatusBadge` — lý do viết ở đó. Tooltip
                  mang luôn câu hệ quả ("QR vẫn hoạt động, người quét thấy trang đã gỡ"), vì biết
                  một artifact đã gỡ mà không biết địa chỉ của nó vẫn sống là thiếu đúng phần quan
                  trọng nhất. */}
              {statusBadge && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      data-testid="row-status-badge"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ArtifactStatusBadge status={statusBadge.status} />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="rounded-[8px] px-3 py-2 max-w-[280px]">
                      <ArtifactStatusNote status={statusBadge.status} className="text-slate-700" />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {/* Row 1: Short URL + copy + open + destination — same line */}
            <div className="flex items-center gap-2 min-w-0 w-full">
              <span className="text-s font-medium text-secondary-blue shrink-0 max-w-[180px] lg:max-w-[300px] truncate">
                {stripProtocol(data.short_url)}
              </span>
              {data.safety_status === 'flagged' && <SafetyFlaggedBadge />}
              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleCopy(AllTouchPointVariants.LINK)}
                  className="flex items-center justify-center p-1.5 rounded-full hover:bg-slate-100"
                >
                  <CopyIcon className="size-4 text-secondary" />
                </button>
                <button
                  onClick={() => window.open(data.short_url, '_blank')}
                  className="flex items-center justify-center p-1.5 rounded-full hover:bg-slate-100"
                >
                  <SquareArrowOutUpRight className="size-4 text-secondary-blue" />
                </button>
              </div>
              {/* `data-testid` nằm ở CẢ Ô, không riêng phần giá trị: với hàng đã gỡ thì toàn bộ
                  nội dung nằm ở nhãn và `value` rỗng, nên gắn testid vào `value` khiến kiểm tự động
                  đọc được chuỗi rỗng rồi kết luận nhầm là cột trống. Ô đích là một đơn vị. */}
              <div data-testid="row-destination" className="flex items-center gap-1 flex-1 min-w-0">
                <MoveRight className="size-3 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-400 shrink-0">{t(destination.labelKey)}</span>
                {destination.value && (
                  <p className="text-s text-slate-500 truncate min-w-0">{destination.value}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* Stats bar: Visit | Lead | Sale — desktop only */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-[6px] px-3 py-1">
              <div className="flex items-center gap-1">
                <Eye className="size-3.5 text-secondary-blue" />
                <span className="text-xs font-normal text-slate-600 whitespace-nowrap">
                  {row.original.visits?.[0]?.count || 0}
                </span>
              </div>
              {featureFlags.conversionTracking && (
                <>
                  <span className="text-xs font-normal text-slate-300">|</span>
                  <div className="flex items-center gap-1">
                    <UserRoundCheck className="size-3.5 text-secondary-dark-cyan" />
                    <span className="text-xs font-normal text-slate-600 whitespace-nowrap">
                      {conversionSummary?.lead_count || 0}
                    </span>
                  </div>
                  <span className="text-xs font-normal text-slate-300">|</span>
                  <div className="flex items-center gap-1">
                    <CircleDollarSign className="size-3.5 text-secondary-orange" />
                    <span className="text-xs font-normal text-slate-600 whitespace-nowrap">
                      {formatCurrencyFromCents(displayRevenue, defaultCurrency)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Mobile: visits only */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                orgRouterPush(`/short-links/${data.id}?tab=analytics`)
              }}
              className="flex md:hidden items-center gap-1 text-secondary-blue"
            >
              <ScanEye className="size-4" />
              <span className="text-s font-medium">{row.original.visits?.[0]?.count || 0}</span>
            </button>

            {/* Analytics button — desktop only */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                orgRouterPush(`/short-links/${data.id}?tab=analytics`)
              }}
              className="hidden md:flex items-center justify-center p-[9px] rounded-[6px] border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <ChartNoAxesCombined className="w-[18px] h-[18px] text-slate-600" />
            </button>

            <div onClick={(e) => e.stopPropagation()}>
              <DataTableRowActions<TouchPointData> row={row} />
            </div>
          </div>
        </div>

        {/* Row 3: Metadata — desktop */}
        <TooltipProvider delayDuration={200}>
          <div className="hidden md:flex items-center gap-4 py-1 w-full flex-wrap">
            {/* Feature icons + UTM merged — max 2 visible, +n for rest */}
            {(() => {
              type IndicatorItem = {
                key: string
                Icon: React.ElementType
                tooltip: React.ReactNode
                hiddenRows: React.ReactNode
              }
              const items: IndicatorItem[] = [
                ...FEATURE_ICON_MAP.filter((f) => featureFlags[f.key]).map((f) => ({
                  key: f.key,
                  Icon: f.Icon,
                  tooltip: t('touchpoint:touch_point_list_v2.feature_enabled', {
                    name: t(`touchpoint:${f.tKey}`),
                  }),
                  hiddenRows: (
                    <div className="flex items-center gap-2">
                      <f.Icon className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-700">{t(`touchpoint:${f.tKey}`)}</span>
                    </div>
                  ),
                })),
                ...(activeUtms.length > 0
                  ? [
                      {
                        key: 'utm',
                        Icon: Megaphone,
                        tooltip: <span className="text-xs">UTM Parameters</span>,
                        hiddenRows: (
                          <div className="flex items-center gap-2">
                            <Megaphone className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-700">UTM Parameters</span>
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]
              if (!items.length) return null
              const visible = items.slice(0, 3)
              const hidden = items.slice(3)
              return (
                <div className="flex items-center gap-1 shrink-0">
                  {visible.map(({ key, Icon, tooltip }) => (
                    <Tooltip key={key}>
                      <TooltipTrigger type="button" className="flex items-center">
                        <Icon className="w-4 h-4 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="rounded-[8px] px-3 py-2 max-w-[200px]">
                        {tooltip}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {hidden.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger type="button" className="flex items-center">
                        <Badge
                          className="px-2 py-0.5 rounded-full border-none text-xs leading-4 font-normal bg-slate-100 text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors"
                          variant="outline"
                        >
                          +{hidden.length}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="rounded-[8px] px-4 py-3 min-w-[160px]">
                        <div className="flex flex-col gap-2">
                          {hidden.map(({ key, hiddenRows }) => (
                            <div key={key}>{hiddenRows}</div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )
            })()}

            {/* Folder / Space — CHỈ hiện khi hàng thật sự thuộc một space.
                "No space" cũ hiện trên **70/70 hàng** của LiHi: một nhãn mọi hàng đều mang thì
                không phân biệt được hàng nào với hàng nào, nó chỉ chiếm chỗ của dòng meta. Cùng
                lập luận đã dùng cho badge "Live" (`getRowStatusBadge`) và `ArtifactAccessBadge`
                bỏ qua `public`. Biểu tượng thư mục cũng đi theo — một cái thư mục rỗng đứng một
                mình không nói gì hơn. */}
            {data.collections && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Folder className="w-3 h-3 text-slate-500" />
                {/* Badge CHỈ hiển thị, không còn là liên kết: `/spaces` đã bị chuyển hướng về
                    chính danh sách này (chốt 2026-10-28, lý do đầy đủ ở `middleware.ts`). Giữ cái
                    tên vì nó là thông tin đúng, nhưng một liên kết dẫn tới chỗ bị chặn thì tệ hơn
                    không có liên kết.
                    ⚠ Bỏ `<Link>` thì mất luôn `stopPropagation` của nó, nên badge sẽ rơi vào
                    onClick của cả hàng — đúng cái ta muốn: bấm đâu trong hàng cũng mở hàng đó. */}
                <Badge
                  className="px-3 py-1 rounded-full border-none text-xs leading-4 font-normal bg-violet-50 text-violet-600"
                  variant="outline"
                  color={data.collections.color || undefined}
                >
                  {data.collections.name.length > 15
                    ? `${data.collections.name.slice(0, 15)}…`
                    : data.collections.name}
                </Badge>
              </div>
            )}

            {/* Tags */}
            <div className="flex items-center gap-1.5 shrink-0">
              <TagIcon className="w-3 h-3 text-slate-500" />
              {data.tp_tag_links.length > 0 ? (
                <div className="flex gap-1 items-center">
                  {visibleTags.map((tag) => (
                    <Badge
                      key={tag.tags.id}
                      className="px-3 py-1 rounded-full border-none text-xs leading-4 font-normal"
                      variant="outline"
                      color={tag.tags.color}
                    >
                      {tag.tags.name.length > 12 ? `${tag.tags.name.slice(0, 12)}…` : tag.tags.name}
                    </Badge>
                  ))}
                  {hiddenTags.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger type="button" className="flex">
                        <Badge
                          className="px-3 py-1 rounded-full border-none text-xs leading-4 font-normal bg-slate-100 text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors"
                          variant="outline"
                        >
                          +{hiddenTags.length}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="rounded-[8px] px-4 py-3 min-w-[160px]">
                        <TooltipList
                          items={hiddenTags.map((t) => ({ label: 'Tag', value: t.tags.name }))}
                        />
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-600">
                  {t('touchpoint:touch_point_list_v2.no_tag')}
                </span>
              )}
            </div>

            <div className="flex-1" />

            {/* Date + avatar */}
            <div className="flex items-center gap-2 shrink-0">
              <CustomAvatar
                src={(data as any).profiles?.avatar}
                name={(data as any).profiles?.name}
                email={(data as any).profiles?.email}
                size={16}
              />
              <RelativeTime
                date={data.created_at}
                className="text-xs text-slate-500 whitespace-nowrap"
              />
            </div>
          </div>
        </TooltipProvider>

        {/* Mobile metadata — simplified */}
        <div className="flex md:hidden items-center gap-2 flex-wrap mt-0.5">
          {data.collections && (
            <div className="flex items-center gap-1 shrink-0">
              <Folder className="w-3 h-3 text-slate-400" />
              <Badge
                className="px-2 py-0.5 rounded-full border-none text-xs leading-4 font-normal bg-violet-50 text-violet-600"
                variant="outline"
                color={data.collections.color || undefined}
              >
                {data.collections.name.length > 12
                  ? `${data.collections.name.slice(0, 12)}…`
                  : data.collections.name}
              </Badge>
            </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <TagIcon className="w-3 h-3 text-slate-400" />
            {data.tp_tag_links.length > 0 ? (
              <Badge
                className="px-2 py-0.5 rounded-full border-none text-xs leading-4 font-normal"
                variant="outline"
                color={data.tp_tag_links[0].tags.color}
              >
                {data.tp_tag_links[0].tags.name.length > 10
                  ? `${data.tp_tag_links[0].tags.name.slice(0, 10)}…`
                  : data.tp_tag_links[0].tags.name}
                {data.tp_tag_links.length > 1 && ` +${data.tp_tag_links.length - 1}`}
              </Badge>
            ) : (
              <span className="text-xs text-slate-600">
                {t('touchpoint:touch_point_list_v2.no_tag')}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 ml-auto whitespace-nowrap">
            {dayjs(data.created_at).format('MMM D, YYYY')}
          </span>
        </div>
      </div>
    </div>
  )
}

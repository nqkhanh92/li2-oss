'use client'
import { ColumnDef } from '@tanstack/react-table'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { TouchPointCard, TouchPointData, TouchPointFeatureFlags } from './touchpoint-card'

function deriveFeatureFlags(data: TouchPointData): TouchPointFeatureFlags {
  const d = data as any

  return {
    // Drives both the feature chip and the lead/sale counts on the card
    conversionTracking: !disabledFeatures.ATTRIBUTION && !!d.conversion_tracking?.enabled,
    targeting:
      (d.targeting?.targets?.length ?? 0) > 0 || (d.targeting?.ab_testing?.length ?? 0) > 0,
    redirectSetting: !!(d.redirect_setting?.not_found_url || d.redirect_setting?.status_code),
    accessControl: !!(
      d.access_control?.password ||
      d.access_control?.expires_at ||
      d.access_control?.valid_from ||
      d.access_control?.limit
    ),
    fbPixel: !!d.tracking?.facebook?.pixel_id,
    gaTracking: !!d.tracking?.google?.ga_id,
    tiktokPixel: !!d.tracking?.tiktok?.pixel_id,
    privacySecurity: !!(d.privacy_security?.link_cloaking || d.privacy_security?.e2e_encryption),
    linkExpiration: !!(d.access_control?.expires_at || d.access_control?.valid_from),
    custom404Redirect: !!d.redirect_setting?.not_found_url,
    linkCloaking: !!d.privacy_security?.link_cloaking,
  }
}

export const touchPointV2Columns: ColumnDef<TouchPointData>[] = [
  {
    id: 'touchpoint',
    enableSorting: false,
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => {
      if (!row.original) return null
      return (
        <TouchPointCard
          row={row}
          featureFlags={deriveFeatureFlags(row.original)}
          key={`card-${row.original.id}`}
        />
      )
    },
  },
]

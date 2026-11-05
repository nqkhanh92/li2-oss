'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { CustomerTable } from './customer-table'
import { AudienceMember } from '../types'
import { FeatureUpgradeSection } from '@/shared/components/customize/feature-upgrade-section'

export function CustomersView({ blocked = false }: { blocked?: boolean }) {
  const { t } = useTranslation('customers')
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()

  /**
   * Hai loại hàng đi hai trang khác nhau: hồ sơ có email mở trang khách hiện có, còn thiết bị ẩn
   * danh mở trang riêng dựng từ `visits` nhóm theo `fp` (nó không có hàng nào trong
   * `customer_profiles` để mà mở).
   */
  const handleRowClick = (member: AudienceMember) => {
    if (member.kind === 'device' && member.fp) {
      router.push(`/org/${org_id}/customers/device/${encodeURIComponent(member.fp)}`)
      return
    }
    router.push(`/org/${org_id}/customers/${member.id}`)
  }

  if (blocked) {
    return (
      <FeatureUpgradeSection
        title={t('plan_upgrade.title')}
        description={t('plan_upgrade.description')}
      />
    )
  }

  return <CustomerTable orgId={org_id} onRowClick={handleRowClick} />
}

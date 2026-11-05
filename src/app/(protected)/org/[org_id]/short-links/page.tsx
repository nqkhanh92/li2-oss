import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Metadata } from 'next'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { ShortLinkList } from '@/features/short-links/components/short-link-list'
import { ShortLinkHeaderActions } from '@/features/short-links/components/short-link-list/short-link-header-actions'

export const metadata: Metadata = {
  title: 'Links & Artifacts',
}

export default async function TouchPointsPage() {
  // Phải nêu `layout` ở đây: `initServerI18n()` không tham số chỉ nạp `common`, và khi thiếu
  // namespace thì i18next in ra KHOÁ THÔ chứ không báo lỗi — hỏng im lặng ngay trên tiêu đề trang.
  const { t } = await initServerI18n(['common', 'layout'])
  return (
    <ContentLayout
      // Tiêu đề phải nói đúng cái danh sách chứa. Nó luôn trả về cả artifact (trên LiHi: 3 link
      // + 58 artifact), nên đặt tên "Link rút gọn" là lý do người dùng tưởng artifact ở kho khác.
      title={<div className="max-w-7xl mx-auto">{t('layout:sidebar.linkAndArtifact')}</div>}
      isBackable={false}
      extra={<ShortLinkHeaderActions />}
    >
      <ShortLinkList />
    </ContentLayout>
  )
}

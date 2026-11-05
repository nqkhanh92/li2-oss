'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { ArtifactCreate } from '@/features/artifacts/components/artifact-create'
import { ShortLinkCreate } from '@/features/short-links/components/short-link-create'
import type { OrgQuota } from '@/shared/types/plan-permission'

import { CreateKindSwitch } from './create-kind-switch'
import { parseCreateKind, type CreateKind } from './create-kind'

/**
 * Trình tạo chung: một trang, một công tắc, hai cây form **đã có sẵn**.
 *
 * Không viết lại form nào. `ShortLinkCreate` và `ArtifactCreate` giữ nguyên, chỉ nhận thêm
 * `titleSlot` để công tắc đứng đúng chỗ tiêu đề.
 *
 * Loại nằm ở **query param**, không phải `useState`, vì ba lý do: tải lại trang không mất lựa
 * chọn, gửi link cho người khác thì họ mở đúng nhánh, và nút Quay lại của trình duyệt làm đúng
 * điều người ta chờ đợi. `replace` chứ không `push` khi đổi công tắc — bấm qua lại hai nhánh năm
 * lần rồi bấm Quay lại mà phải bấm năm lần mới thoát được là một cái bẫy.
 *
 * Hai route cũ (`/short-links/create`, `/artifacts/create`) vẫn sống nguyên: chúng render thẳng
 * component tương ứng, không qua đây. Bookmark và link sâu không gãy.
 */
export const UnifiedCreate = ({ blocked, orgQuota }: { blocked: boolean; orgQuota?: OrgQuota }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const kind = parseCreateKind(searchParams.get('kind'))

  const setKind = (next: CreateKind) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('kind', next)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const titleSlot = <CreateKindSwitch value={kind} onChange={setKind} />

  return kind === 'artifact' ? (
    <ArtifactCreate titleSlot={titleSlot} />
  ) : (
    <ShortLinkCreate blocked={blocked} orgQuota={orgQuota} titleSlot={titleSlot} />
  )
}

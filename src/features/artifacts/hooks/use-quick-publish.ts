'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ARTIFACT_MAX_BYTES } from '@/core/types/artifact.type'
import type { ArtifactAccessMode } from '@/core/types/artifact.type'

import { useCreateArtifact, usePublishArtifact } from './use-artifacts'
import { hasAcceptedExtension, randomSlug } from '../constants'
import { formatBytes } from '../utils/format-bytes'
import { artifactApiI18n } from '../utils/api-error'

/**
 * "Thả một file là có link ngay": tải lên rồi xuất bản trong cùng một thao tác, slug ngẫu nhiên,
 * công khai.
 *
 * Tách khỏi `ArtifactQuickPublish` vì giờ có **hai** bề mặt chạy đúng luồng này — ô thả file ở
 * trang `/artifacts`, và ô dán-link-hoặc-thả-file ở danh sách gộp. Chép đôi cái thân hàm này
 * nghĩa là lần sửa cách xử lý lỗi tiếp theo sẽ sửa được một chỗ và quên chỗ kia, mà chỗ quên
 * không có gì báo.
 *
 * Hook chỉ lo *việc*; mỗi bề mặt tự vẽ phần nhìn của mình.
 */
export function useQuickPublishArtifact() {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation(['artifact', 'common'])

  const { mutateAsync: createArtifact } = useCreateArtifact(org_id)
  const { mutateAsync: publishArtifact } = usePublishArtifact(org_id)

  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [published, setPublished] = useState<{ shortUrl: string; accessMode: ArtifactAccessMode }>()

  /** Backend trả khoá i18n riêng cho từng lỗi; chỉ rơi về câu chung khi không đọc được khoá. */
  const messageFor = (error: unknown, fallbackKey: string) => {
    const i18n = artifactApiI18n(error)
    return i18n ? t(i18n.key, i18n.params) : t(fallbackKey)
  }

  const run = async (file: File) => {
    if (!hasAcceptedExtension(file.name)) {
      toast.error(t('artifact:errors.wrong_type', { max: formatBytes(ARTIFACT_MAX_BYTES) }))
      return
    }
    if (file.size > ARTIFACT_MAX_BYTES) {
      toast.error(
        t('artifact:errors.file_too_large', {
          max: formatBytes(ARTIFACT_MAX_BYTES),
          size: formatBytes(file.size),
        })
      )
      return
    }

    setBusy(file.name)
    setProgress(0)
    try {
      const created = await createArtifact({ file, onUploadProgress: setProgress })
      // Upload xong mà publish hỏng thì artifact nằm lại ở draft — nói rõ chỗ tìm nó, đừng để
      // người dùng tưởng mất file rồi tải lên lần nữa và sinh ra bản trùng.
      try {
        const result = await publishArtifact({
          artifact_id: created.id,
          slug: randomSlug(),
          access_mode: 'public',
        })
        if (result.short_url) {
          setPublished({ shortUrl: result.short_url, accessMode: 'public' })
        } else {
          toast.success(t('artifact:quick.published_no_link'))
        }
      } catch (error) {
        toast.error(messageFor(error, 'artifact:quick.publish_failed_draft'))
      }
    } catch (error) {
      toast.error(messageFor(error, 'artifact:errors.upload_failed'))
    } finally {
      setBusy(null)
      setProgress(0)
    }
  }

  const pick = (files: FileList | null) => {
    const file = files?.[0]
    if (file) void run(file)
  }

  return { busy, progress, published, pick, run, dismissPublished: () => setPublished(undefined) }
}

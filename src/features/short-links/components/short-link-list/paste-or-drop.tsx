'use client'

import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle, Paperclip } from 'lucide-react'

import { ARTIFACT_FILE_ACCEPT } from '@/core/types/artifact.type'
import { ArtifactCreatedDialog } from '@/features/artifacts/components/artifact-created-dialog'
import { useQuickPublishArtifact } from '@/features/artifacts/hooks/use-quick-publish'
import { cn } from '@/shared/lib/utils'

import { PasteLinkHeader } from './paste-link-header'

/**
 * MỘT bề mặt tạo nhanh cho cả hai loại: dán link, hoặc thả file.
 *
 * Trước đây là hai thứ cạnh nhau — ô dán link, và một ô thả file lớn. Hai ô cho hai loại trên một
 * trang đã gộp là chính cái tín hiệu "trang này về link, artifact là phần thêm vào" mà bản này
 * phải bỏ.
 *
 * **Không xoá tính năng nào.** Ô dán link vẫn nhận 10 link một lúc; thả file vẫn tải lên rồi xuất
 * bản ngay. Việc duy nhất thay đổi là chúng không còn tự giới thiệu theo loại: người dùng đưa thứ
 * họ có vào một chỗ, Li2 tự biết đó là gì. Kẹp giấy ở cuối là cho ai muốn chọn file thay vì kéo
 * thả — thả được thì cũng phải bấm được.
 *
 * Vùng thả bao cả ô, không chỉ cái kẹp giấy: người ta kéo file tới *ô nhập*, không nhắm vào một
 * biểu tượng 20px.
 */
export const PasteOrDrop = ({ orgId, className }: { orgId: string; className?: string }) => {
  const { t } = useTranslation(['touchpoint', 'artifact'])
  const { busy, progress, published, pick, dismissPublished } = useQuickPublishArtifact()

  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

  return (
    <>
      <div
        data-testid="paste-or-drop"
        className={cn('relative', className)}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          pick(e.dataTransfer.files)
        }}
      >
        <div className="flex items-center gap-2">
          <PasteLinkHeader orgId={orgId} className="min-w-0 flex-1" />

          <label
            htmlFor={inputId}
            title={t('artifact:quick.title')}
            className={cn(
              'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-slate-300 bg-card text-slate-500 transition-colors hover:border-slate-400',
              'focus-within:border-primary focus-within:ring-1 focus-within:ring-ring',
              busy && 'pointer-events-none opacity-70'
            )}
          >
            <input
              id={inputId}
              type="file"
              accept={ARTIFACT_FILE_ACCEPT}
              className="sr-only"
              disabled={!!busy}
              onChange={(e) => {
                pick(e.target.files)
                // Cho phép chọn lại đúng file vừa chọn sau khi nó hỏng.
                e.target.value = ''
              }}
            />
            {busy ? (
              <LoaderCircle className="size-4 animate-spin text-primary" />
            ) : (
              <Paperclip className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only">{t('artifact:quick.title')}</span>
          </label>
        </div>

        {/* Lớp phủ chỉ xuất hiện khi đang kéo file tới: nó nói "thả được ở đây", và nếu hiện
            thường trực thì nó lại thành một ô thả file thứ hai — đúng thứ vừa gộp đi. */}
        {isDragging && (
          <div
            data-testid="paste-or-drop-overlay"
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[8px] border border-dashed border-primary bg-primary/5 text-xs font-medium text-primary"
          >
            {t('artifact:quick.title')}
          </div>
        )}

        {busy && (
          <p className="mt-1 truncate text-xs text-slate-500">
            {progress > 0
              ? t('artifact:quick.uploading', { percent: Math.round(progress) })
              : t('artifact:quick.working', { name: busy })}
          </p>
        )}
      </div>

      {published && (
        <ArtifactCreatedDialog
          shortUrl={published.shortUrl}
          accessMode={published.accessMode}
          onClose={dismissPublished}
        />
      )}
    </>
  )
}

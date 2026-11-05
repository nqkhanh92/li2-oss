'use client'

import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle, UploadCloud } from 'lucide-react'

import { ARTIFACT_FILE_ACCEPT } from '@/core/types/artifact.type'
import { cn } from '@/shared/lib/utils'

import { useQuickPublishArtifact } from '../hooks/use-quick-publish'
import { ArtifactCreatedDialog } from './artifact-created-dialog'

/**
 * Ô thả file lớn ở trang `/artifacts`. Việc tải lên + xuất bản nằm ở `useQuickPublishArtifact`,
 * dùng chung với ô dán-link-hoặc-thả-file của danh sách gộp.
 *
 * Trang tạo đầy đủ vẫn còn cho người cần đặt tên, đổi đường dẫn hoặc khoá bằng mật khẩu.
 */
export const ArtifactQuickPublish = ({ className }: { className?: string }) => {
  const { t } = useTranslation(['artifact', 'common'])
  const { busy, progress, published, pick, dismissPublished } = useQuickPublishArtifact()

  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

  return (
    <>
      {/* Cùng bố cục với dropzone ở trang tạo đầy đủ (`artifact-create/artifact-dropzone.tsx`):
          ô lớn, icon trên, chữ căn giữa — chủ sản phẩm 2026-10-23. Trước đây là một dải ngang
          kèm nút "Choose file" riêng, trông không giống chỗ kia dù làm cùng một việc.
          `<label>` + input ẩn thay cho div onClick: tab tới được, Enter/Space mở hộp chọn file. */}
      <label
        htmlFor={inputId}
        className={cn(
          'flex flex-col items-center justify-center gap-3 w-full rounded-[16px] border border-dashed bg-card px-6 py-10 text-center transition-colors cursor-pointer',
          'focus-within:border-primary focus-within:ring-1 focus-within:ring-ring',
          isDragging ? 'border-primary bg-primary/5' : 'border-slate-300',
          busy && 'pointer-events-none opacity-70',
          className
        )}
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
          <LoaderCircle className="w-7 h-7 animate-spin text-primary" />
        ) : (
          <UploadCloud className="w-7 h-7 text-slate-400" />
        )}
        <p className="text-s font-medium text-foreground break-all">
          {busy ? t('artifact:quick.working', { name: busy }) : t('artifact:quick.title')}
        </p>
        <p className="text-xs text-slate-500">
          {busy && progress > 0
            ? t('artifact:quick.uploading', { percent: Math.round(progress) })
            : t('artifact:quick.hint')}
        </p>
      </label>

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

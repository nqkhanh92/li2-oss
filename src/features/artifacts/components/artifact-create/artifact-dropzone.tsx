'use client'

import { useId, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  ARTIFACT_FILE_ACCEPT,
  ARTIFACT_KIND_SPECS,
  ARTIFACT_MAX_BYTES,
  ARTIFACT_UPLOAD_KINDS,
  artifactKindForFileName,
} from '@/core/types/artifact.type'
import { cn } from '@/shared/lib/utils'

import { formatBytes } from '../../utils/format-bytes'
import { getArtifactKindViewForUploadKind } from '../../utils/artifact-kind'

interface ArtifactDropzoneProps {
  file: File | null
  onFileChange: (file: File | null) => void
  error?: string | null
  disabled?: boolean
}

/**
 * Ba kind đi qua viewer của Microsoft, tức file RỜI KHỎI hệ thống. Suy từ `ARTIFACT_KIND_SPECS`
 * thay vì liệt kê tay: thêm một định dạng Office nữa mà quên dòng này thì cảnh báo biến mất
 * đúng lúc nó cần nhất.
 */
const OFFICE_VIEWER_KINDS = ARTIFACT_UPLOAD_KINDS.filter(
  (k) => ARTIFACT_KIND_SPECS[k].serveMode === 'office-viewer'
)

/**
 * `<label>` + `<input type="file">` ẩn thay vì `div` gắn onClick: bàn phím tab
 * tới được, Enter/Space mở hộp chọn file, và focus ring hiện qua `:focus-within`
 * vì chính input mới nhận focus.
 */
export const ArtifactDropzone = ({
  file,
  onFileChange,
  error,
  disabled,
}: ArtifactDropzoneProps) => {
  const { t } = useTranslation('artifact')
  const inputId = useId()
  const errorId = useId()
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    onFileChange(files?.[0] ?? null)
  }

  /**
   * Kind suy từ ĐUÔI FILE qua hàm của core, không từ `file.type`. Trình duyệt báo `File.type`
   * rỗng rất thường xuyên với `.pptx` và `.mov`, nên lọc theo nó sẽ chặn file hợp lệ ngay trên
   * máy người dùng trong khi backend vẫn nhận — hai cổng nói hai chuyện.
   */
  const kind = file ? artifactKindForFileName(file.name) : null
  const kindView = kind ? getArtifactKindViewForUploadKind(kind) : null

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (disabled) return
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 w-full rounded-[16px] border border-dashed border-slate-300 bg-card px-6 py-10 text-center transition-colors cursor-pointer',
          'focus-within:border-primary focus-within:ring-1 focus-within:ring-ring',
          isDragging && 'border-primary bg-primary/5',
          error && 'border-semantic-error',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          id={inputId}
          type="file"
          accept={ARTIFACT_FILE_ACCEPT}
          className="sr-only"
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <>
            {kindView ? (
              <kindView.Icon className="w-7 h-7 text-slate-400" />
            ) : (
              <UploadCloud className="w-7 h-7 text-slate-400" />
            )}
            <p className="text-s font-medium text-foreground break-all">
              {t('create.dropzone.selected', { name: file.name, size: formatBytes(file.size) })}
            </p>
            {/* Badge xám, không màu: badge trạng thái ở các màn khác đã mang màu ngữ nghĩa */}
            {kindView && (
              <span className="px-2 py-0.5 rounded-full text-xs leading-4 font-normal bg-slate-100 text-slate-500">
                {t(kindView.labelKey)}
              </span>
            )}
            <span className="text-xs text-slate-500 underline">{t('create.dropzone.change')}</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-7 h-7 text-slate-400" />
            <p className="text-s font-medium text-foreground">{t('create.dropzone.label')}</p>
            <p className="text-xs text-slate-500">
              {t('create.dropzone.hint', { max: formatBytes(ARTIFACT_MAX_BYTES) })}
            </p>
          </>
        )}
      </label>

      {/**
       * Người dùng phải biết file của mình sẽ rời khỏi hệ thống TRƯỚC khi bấm Xuất bản, không
       * phải sau. Hiện ngay khi chọn `.ppt`/`.pptx`, ngoài khung dropzone để không bị coi là
       * một dòng trang trí bên trong ô chọn file.
       */}
      {kind !== null && OFFICE_VIEWER_KINDS.includes(kind) && (
        <p className="text-xs text-slate-500">{t('create.office_notice')}</p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-semantic-error">
          {error}
        </p>
      )}
    </div>
  )
}

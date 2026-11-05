import { useEffect, useRef, useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import { UploadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
type FileUploaderProps = {
  onFileChange: (file: File) => void
  accept?: string
  noPreview?: boolean
}
export default function FileUploader({
  onFileChange,
  accept = 'image/*',
  noPreview = false,
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const { t } = useTranslation('common')

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0]

      // Check file type based on accept prop
      const isValidType =
        accept === 'text/csv'
          ? file.type === 'text/csv' || file.name.endsWith('.csv')
          : file.type.startsWith(accept.split('/')[0])

      if (isValidType) {
        setFile(file)
        onFileChange(file)
      } else {
        alert(t('messages.error.invalid_file_type', { type: accept }))
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      onFileChange(e.target.files[0])
    }
  }
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileUrl, setFileUrl] = useState<string>('')

  useEffect(() => {
    if (file) {
      const fileUrl = URL.createObjectURL(file)
      setFileUrl(fileUrl)
    }
  }, [file])

  return (
    <div>
      <div
        className={`bg-slate-50 border border-dashed divide-dashed rounded-lg flex flex-col gap-4 p-4 items-center justify-end hover:cursor-pointer hover:border-slate-600 ${
          dragActive ? 'border-slate-600 bg-slate-100' : 'border-slate-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          inputRef.current?.click()
        }}
      >
        {file && !noPreview ? (
          <>
            <div className="bg-background rounded-full p-[7px] flex items-center justify-center w-[29px] h-[29px]">
              <UploadIcon className="w-[18px] h-[18px] text-slate-900" strokeWidth={2} />
            </div>
            <img src={fileUrl} alt="file" className="w-20 h-20 m-0 border rounded-md" />
            <p className="text-xs text-slate-600">
              {t('text.selected_file')}: {file.name}
            </p>
          </>
        ) : (
          <>
            <div className="bg-background rounded-full p-[7px] flex items-center justify-center w-[29px] h-[29px]">
              <UploadIcon className="w-[18px] h-[18px] text-slate-900" strokeWidth={2} />
            </div>
            <p className="text-xs text-slate-600">
              {t('text.drag_and_drop_a_file_or_click_to_browse')}
            </p>
          </>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <Input
          className="hidden"
          ref={inputRef}
          id="file"
          type="file"
          placeholder="File"
          accept={accept}
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}

'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { X, Upload, FileText, Image as ImageIcon, File } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { cva, VariantProps } from 'class-variance-authority'
import NextImage from 'next/image'
import { ImagePlaceholderIcon } from '../icons/image-placeholder-icon'
import { Label } from '../ui/label'
import { useTranslation } from 'react-i18next'

const variants = cva('', {
  variants: {
    variant: {
      button: '',
      dropzone: '',
    },
    size: {
      default: '[&_svg]:w-20 [&_svg]:h-20 text-base font-semibold',
      sm: '[&_svg]:w-6 [&_svg]:h-6 text-sm font-medium',
      lg: '[&_svg]:w-10 [&_svg]:h-10 text-base font-semibold',
      xs: '[&_svg]:w-4 [&_svg]:h-4 text-xs font-medium',
    },
  },
  defaultVariants: {
    variant: 'button',
    size: 'default',
  },
})

interface FileItem {
  id: string
  name: string
  size?: number
  type?: string
  file?: File
  url?: string
  preview?: string
  isDefault?: boolean
}

interface Props extends VariantProps<typeof variants> {
  mode: 'direct' | 'temp'
  accept?: string
  maxSize?: number // in MB
  multiple?: boolean
  onUpload?: (result: string | File | File[] | null) => void
  onError?: (error: string) => void
  className?: string
  disabled?: boolean
  label?: string
  defaultValue?: string | File | File[] // File URL string
  description?: string
}

export default function UploadFile({
  mode = 'direct',
  accept = 'image/*,application/pdf,.doc,.docx',
  maxSize = 10,
  multiple = false,
  onUpload,
  onError,
  className,
  disabled = false,
  variant,
  label,
  size,
  defaultValue,
  description,
}: Props) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize default file from URL
  useEffect(() => {
    if (defaultValue && files.length === 0) {
      if (typeof defaultValue === 'string') {
        const fileName = defaultValue.split('/').pop() || 'default-file'
        const defaultFile: FileItem = {
          id: 'default-' + Math.random().toString(36).substring(7),
          name: fileName,
          url: defaultValue,
          isDefault: true,
        }
        setFiles([defaultFile])
      } else {
        const defaultFiles = Array.isArray(defaultValue) ? defaultValue : [defaultValue]
        setFiles(defaultFiles.map((file) => createFileItem(file)))
      }
    }
  }, [defaultValue, files.length])

  // Simulate S3 upload - replace with your actual S3 upload logic
  const uploadToS3 = async (file: File): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return `https://your-bucket.s3.amazonaws.com/${Date.now()}-${file.name}`
  }

  const createFileItem = (file: File): FileItem => {
    const id = Math.random().toString(36).substring(7)
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined

    return {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      preview,
      isDefault: false,
    }
  }

  const validateFile = (file: File): boolean => {
    if (file.size > maxSize * 1024 * 1024) {
      onError?.(`File ${file.name} is too large. Maximum size is ${maxSize}MB`)
      return false
    }
    return true
  }

  const handleFiles = useCallback(
    async (selectedFiles: FileList) => {
      // Parse accept string into an array (e.g., "image/*,.pdf" => ["image/*", ".pdf"])
      const acceptedTypes = accept ? accept.split(',').map((type) => type.trim().toLowerCase()) : []

      // Helper to check if file matches accept criteria
      const isFileAccepted = (file: File) => {
        if (acceptedTypes.length === 0) return true // no accept = accept all

        return acceptedTypes.some((type) => {
          if (type === '*/*') return true // accept all mime types
          if (type.endsWith('/*')) {
            // e.g. image/*, video/*
            const mainType = type.split('/')[0]
            return file.type.startsWith(mainType + '/')
          }
          if (type.startsWith('.')) {
            // e.g. .pdf, .docx
            return file.name.toLowerCase().endsWith(type)
          }
          // exact MIME type match
          return file.type === type
        })
      }

      // Filter files first by accept prop and then by validateFile
      const validFiles = Array.from(selectedFiles).filter(
        (file) => isFileAccepted(file) && validateFile(file)
      )
      if (validFiles.length === 0) return

      const newFileItems = validFiles.map(createFileItem)

      // Remove default files when new files are added
      const nonDefaultFiles = files.filter((f) => !f.isDefault)
      const updatedFiles = multiple ? [...nonDefaultFiles, ...newFileItems] : newFileItems

      if (mode === 'temp') {
        // Temp mode - store files for later upload
        setFiles(updatedFiles)
        const result = multiple
          ? updatedFiles.map((f) => f.file!).filter(Boolean)
          : updatedFiles[0]?.file || null
        onUpload?.(result)
      } else {
        // Direct mode - upload to S3 immediately
        setUploading(true)
        try {
          if (multiple) {
            const urls = await Promise.all(validFiles.map(uploadToS3))
            onUpload?.(urls.join(','))
          } else {
            const url = await uploadToS3(validFiles[0])
            onUpload?.(url)
          }
          setFiles(updatedFiles)
        } catch (error) {
          onError?.('Upload failed. Please try again.')
        } finally {
          setUploading(false)
        }
      }
    },
    [files, mode, multiple, accept, onUpload, onError]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)

      if (disabled || uploading) return

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles)
      }
    },
    [disabled, uploading, handleFiles]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled && !uploading) {
        setDragActive(true)
      }
    },
    [disabled, uploading]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const removeFile = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id)
    setFiles(updatedFiles)

    if (mode === 'temp') {
      const result = multiple
        ? updatedFiles.map((f) => f.file!).filter(Boolean)
        : updatedFiles[0]?.file || null
      onUpload?.(result)
    } else {
      onUpload?.(multiple ? [] : null)
    }
  }

  const triggerFileInput = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  const getFileIcon = (fileName: string, fileType?: string) => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    }

    const extension = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return <ImageIcon className="h-4 w-4" />
    }
    if (extension === 'pdf' || fileType?.includes('pdf')) {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const isImage = (fileItem: FileItem) => {
    if (fileItem.type?.startsWith('image/')) return true
    if (fileItem.url) {
      return isImageUrl(fileItem.url)
    }
    return false
  }
  function isImageUrl(url: string) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    })
  }

  const getImageSrc = (fileItem: FileItem) => {
    return fileItem.preview || fileItem.url || ''
  }

  const { t } = useTranslation('advanced_custom')
  const renderPreviews = () => {
    if (files.length === 0) return null

    // Single file mode with image preview
    if (!multiple && files.length === 1 && isImage(files[0])) {
      return (
        <div className="w-full h-full">
          {/* `unoptimized`: `getImageSrc` trả `fileItem.preview` (blob: của URL.createObjectURL —
              Next tự ép unoptimized cho blob) HOẶC `fileItem.url`, mà `url` đến từ `defaultValue`,
              và caller duy nhất của component này truyền vào ảnh META của khách. Tập host đó MỞ
              (174 host, đo trên prod) nên không whitelist được — lý do đầy đủ ở
              `touch-point-details/meta-tags-preview.tsx`. */}
          <NextImage
            src={getImageSrc(files[0])}
            alt={files[0].name}
            width={1200}
            height={628}
            className="w-full h-full"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        </div>
      )
    }

    // List view for multiple files or non-image single files
    return (
      <div className="space-y-3 mb-4">
        {files.map((fileItem) => (
          <Card key={fileItem.id} className="p-3">
            <div className="flex items-center gap-3">
              {isImage(fileItem) ? (
                <img
                  src={getImageSrc(fileItem)}
                  alt={fileItem.name}
                  className="h-12 w-12 object-cover rounded"
                />
              ) : (
                <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                  {getFileIcon(fileItem.name, fileItem.type)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileItem.name}</p>
                <p className="text-xs text-gray-500">
                  {fileItem.isDefault
                    ? 'Default file'
                    : fileItem.size
                    ? formatFileSize(fileItem.size)
                    : 'Unknown size'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {fileItem.isDefault
                    ? 'Current'
                    : mode === 'direct'
                    ? uploading
                      ? 'Uploading...'
                      : 'Uploaded'
                    : 'Ready'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(fileItem.id)}
                  disabled={uploading}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const renderUploadArea = () => (
    <div className="px-2 py-4 flex flex-col items-center justify-center">
      <ImagePlaceholderIcon className={cn('text-gray-400', dragActive && 'text-primary')} />
      <div className="space-y-2">
        <p className="text-xs font-normal">
          {dragActive ? 'Drop files here' : description ?? 'Drop files here or click to browse'}
        </p>
        {/* <p className="text-xs text-gray-400">
          {accept === "image/*"
            ? "Images only"
            : "Supports images, PDFs, and documents"}
          {maxSize && ` • Max ${maxSize}MB`}
          {multiple && " • Multiple files allowed"}
        </p> */}
      </div>
      {uploading && (
        <div className="mt-2">
          <Badge variant="secondary">Uploading...</Badge>
        </div>
      )}
    </div>
  )

  // Button variant
  if (variant === 'button') {
    return (
      <div className={cn(className, variants({ variant, size }))}>
        {renderPreviews()}
        <Button
          onClick={triggerFileInput}
          disabled={disabled || uploading}
          variant="outline"
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Choose Files'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
    )
  }

  // Dropzone variant
  return (
    <div className={cn(className, variants({ variant, size }))}>
      <div className="flex justify-between">
        {label ? <Label className="text-sm font-medium mb-2">{label}</Label> : <></>}
        <span
          onClick={triggerFileInput}
          className="cursor-pointer flex items-center gap-2 text-primary text-sm font-medium"
        >
          <Upload className="h-[18px]! w-[18px]!" /> {t('advanced_form.meta_tags.choose_file')}
        </span>
      </div>
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer group h-32 bg-[#F4F4F4] overflow-hidden',
          dragActive && 'border-primary bg-primary/5',
          (disabled || uploading) && 'opacity-50 cursor-not-allowed'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerFileInput}
      >
        <CardContent className="h-full flex flex-col items-center justify-center text-center p-0 relative">
          {files.length === 0 ? (
            renderUploadArea()
          ) : (
            <>
              <div
                className={cn(
                  'flex flex-col items-center justify-center text-center group-hover:opacity-90 opacity-0 transition-opacity duration-300 absolute top-0 left-0 w-full h-full z-10 bg-slate-100',
                  dragActive && 'opacity-90!'
                )}
              >
                {renderUploadArea()}
              </div>
              <div className="z-5 w-full h-full">{renderPreviews()}</div>
            </>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  )
}

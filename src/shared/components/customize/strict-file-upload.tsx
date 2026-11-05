import { useEffect, useRef, useState } from 'react'
import { Ban, BanIcon, UploadIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { defaultQrLogo } from '@/features/touch-points/constants/default-qr-logo'
import Image from 'next/image'
import { Input } from '../ui/input'
import { toast } from 'sonner'
import { Button } from '../ui/button'

type StrictFileUploaderProps = {
  className?: string
  fileType?: string[]
  onFileChange: (file: File | string) => void
  onRemove?: () => void
  file?: File | string | null
  setFile?: (file: File | string | null) => void
  maxFileSize?: number
}

export default function StrictFileUploader({
  className,
  fileType = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
  onFileChange,
  onRemove,
  file,
  setFile,
  maxFileSize,
}: StrictFileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [fileUrl, setFileUrl] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset input value when file is removed
  useEffect(() => {
    if (!file && inputRef.current) {
      inputRef.current.value = ''
    }
  }, [file])

  const isValidFileType = (filename: string) => {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
    return fileType.includes(ext)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const validateImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = document.createElement('img')
      img.src = URL.createObjectURL(file)
      img.onload = () => {
        // const valid = img.width <= 1920 && img.height <= 1080;
        const valid = true
        URL.revokeObjectURL(img.src)
        resolve(valid)
      }
      img.onerror = () => {
        resolve(false)
      }
    })
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      if (!isValidFileType(droppedFile.name)) {
        toast.error('Error', {
          description: 'Please upload supported file types',
        })
        return
      }

      if (maxFileSize && droppedFile.size > maxFileSize * 1024 * 1024) {
        toast.error('Error', {
          description: `File size exceeds the ${maxFileSize}MB limit`,
        })
        return
      }

      const isValidDimensions = await validateImageDimensions(droppedFile)
      if (!isValidDimensions) {
        toast.error('Error', {
          description: 'Image must be ≤ 1920×1080',
        })
        return
      }
      setFile?.(droppedFile)
      onFileChange(droppedFile)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      toast.error('Error', {
        description: 'No file selected',
      })
      return
    }
    const selectedFile = e.target.files[0]
    if (!isValidFileType(selectedFile.name)) {
      toast.error('Error file type', {
        description: 'Please upload supported file types',
      })
      return
    }

    const isValidDimensions = await validateImageDimensions(selectedFile)
    if (!isValidDimensions) {
      toast.error('Error image dimension', {
        description: 'Qr Logo must be ≤ 1920×1080',
      })
      return
    }
    setFile?.(selectedFile)
    onFileChange(selectedFile)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  useEffect(() => {
    let objectUrl: string
    if (!file) return
    if (file instanceof File) {
      objectUrl = URL.createObjectURL(file)
      setFileUrl(objectUrl)
    } else if (typeof file === 'string') {
      setFileUrl(file)
    }
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [file])

  return (
    <div
      className={cn(
        `flex items-center justify-between gap-3 cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        }`,
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2">
        <Ban
          className="w-[36px] h-[36px] min-w-[36px] min-h-[36px] m-0 rounded-full border-[0.5px] border-neutral-700 p-1 text-neutral-900 stroke-[0.5px] hover:border-black!"
          size={20}
          onClick={(e) => {
            e.stopPropagation()
            if (fileUrl) {
              URL.revokeObjectURL(fileUrl)
              setFileUrl('')
            }
            onRemove?.()
          }}
        />
        {defaultQrLogo &&
          Array.isArray(defaultQrLogo) &&
          defaultQrLogo.map((logo, index) => (
            <Button
              key={index}
              variant="secondary"
              size={'icon'}
              type="button"
              className={cn(
                'h-9 w-9 rounded-full border-slate-300 border-[1.5px] overflow-hidden bg-background hover:border-black! p-1'
              )}
              onClick={(e) => {
                e.stopPropagation()
                setFile?.(null)
                onFileChange(logo.image)
              }}
            >
              {logo ? (
                <div
                  className="w-10 h-10"
                  style={{
                    backgroundImage: `url(${logo.image})`,
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                  }}
                ></div>
              ) : (
                <BanIcon strokeWidth={2} className="w-7! h-7! text-slate-600" />
              )}
            </Button>
          ))}
        <UploadIcon
          className="w-[36px] h-[36px] m-0 rounded-full border-none p-2 bg-neutral-400 text-primary overflow-visible"
          size={20}
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
        />
      </div>
      <Input
        type="file"
        accept={fileType.join(',')}
        onChange={handleFileChange}
        ref={inputRef}
        className="hidden"
        style={{ display: 'none' }}
      />
    </div>
  )
}

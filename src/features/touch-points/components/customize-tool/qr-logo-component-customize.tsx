'use client'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { toast } from '@/shared/hooks/use-toast'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import StrictFileUploader from '@/shared/components/customize/strict-file-upload'
import { FormField, FormItem } from '@/shared/components/ui/form'
import { touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { makeCircleImage } from '@/shared/lib/utils'

export interface QrLogoRef {
  getFile: () => File | null
}

export const QrLogoComponentCustomize = forwardRef<QrLogoRef, { className?: string }>(
  ({ className }, ref) => {
    const { qrOptions, setQrOptions } = useQrContext()
    const [file, setFile] = useState<File | string | null>(null)
    const [url, setUrl] = useState<string>('')
    const { control, setValue } = useFormContext<z.infer<typeof touchPointUpdateSchema>>()
    useImperativeHandle(ref, () => ({
      getFile: () => file as File | null,
    }))
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const onLogoChange = async (file: File | string) => {
      try {
        if (typeof file === 'string') {
          setUrl(file)
          setValue('qr_logo_image', file, {
            shouldDirty: true,
          })
          setQrOptions({ ...qrOptions, image: file })
          return
        } else {
          setFile(file)
          if (file instanceof File) {
            const { file: pngFile, url } = await makeCircleImage(file, 12)
            setUrl(url)
            setValue('qr_logo_image', pngFile, {
              shouldDirty: true,
            })
            setQrOptions({ ...qrOptions, image: url })
          }
        }
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: e.message,
        })
      }
    }
    useEffect(() => {
      const setLogo = async () => {
        if (file) {
          if (file instanceof File) {
            const { file: pngFile, url } = await makeCircleImage(file, 12)
            setUrl(url)
            setValue('qr_logo_image', pngFile, {
              shouldDirty: true,
            })
            setQrOptions({ ...qrOptions, image: url })
          } else {
            setValue('qr_logo_image', '', {
              shouldDirty: true,
            })
            setQrOptions({ ...qrOptions, image: undefined })
          }
        }
      }
      setLogo()
    }, [file])

    const onLogoRemove = () => {
      setFile(null)
      setValue('qr_logo_image', '', {
        shouldDirty: true,
      })
      setQrOptions({
        ...qrOptions,
        image: undefined,
      })
      setUrl('')
    }
    return (
      <FormField
        control={control}
        name="qr_logo_image"
        render={({ field }) => (
          <FormItem>
            <div className={cn('flex flex-col gap-4', className)}>
              <StrictFileUploader
                maxFileSize={10}
                fileType={['.png', '.jpg', '.jpeg', '.svg']}
                onFileChange={onLogoChange}
                onRemove={onLogoRemove}
                file={file as File}
                setFile={setFile}
              />
            </div>
          </FormItem>
        )}
      />
    )
  }
)

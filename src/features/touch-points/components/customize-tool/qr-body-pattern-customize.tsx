'use client'
import { ColorMode, EYE_DOT, EYE_DOT_MIX_BORDER_DOT } from '@/shared/constants/utils'
import { Card, CardContent, CardTitle, CardHeader } from '@/shared/components/ui/card'
import { BODY_PATTERN, EYE_BORDER } from '@/shared/constants/utils'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { cn } from '@/shared/lib/utils'
import NextImage from 'next/image'
import type { DotType, Gradient, Options } from 'qr-code-styling'
import React, { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { updateQrCustomizeOptionsSchema } from '@/shared/schemas/touch-points'
type QrBodyPatternCustomizeProps = {
  pattern: 'body' | 'mix_eye_border_dot' | 'eye_border' | 'eye_dot'
}

type PatternValue =
  | string
  | {
      cornersDotOptions: string
      cornersSquareOptions: string
    }

type PatternItem = {
  id: string
  name: string
  value: PatternValue
  image: string
}
type BodyPatternType = {
  type: DotType
}

type MixedEyePatternType = {
  cornersDotOptions: BodyPatternType
  cornersSquareOptions: BodyPatternType
}
const patternList = {
  body: {
    pattern: BODY_PATTERN,
    name: 'dotsOptions',
    itemSize: 'w-[100px] h-[100px]',
    title: 'Body Pattern:',
  },
  eye_border: {
    pattern: EYE_BORDER,
    name: 'cornersSquareOptions',
    itemSize: 'w-[38px] h-[38px]',
    title: 'External Eye Patterns:',
  },
  eye_dot: {
    pattern: EYE_DOT,
    name: 'cornersDotOptions',
    itemSize: 'w-[38px] h-[38px]',
    title: 'Internal Eye Patterns:',
  },
  mix_eye_border_dot: {
    pattern: EYE_DOT_MIX_BORDER_DOT,
    name: ['cornersSquareOptions', 'cornersDotOptions'],
    itemSize: 'w-[38px] h-[38px]',
    title: 'Eye Patterns:',
  },
}
export const QrBodyPatternCustomize = ({ pattern }: QrBodyPatternCustomizeProps) => {
  const { setValue } = useFormContext<z.infer<typeof updateQrCustomizeOptionsSchema>>()
  const { qrOptions, setQrOptions } = useQrContext()
  const [bodyPattern, setBodyPattern] = useState<BodyPatternType>({
    type: 'square',
  })
  const [mixedEyePattern, setMixedEyePattern] = useState<MixedEyePatternType>({
    cornersDotOptions: {
      type: 'square',
    },
    cornersSquareOptions: {
      type: 'square',
    },
  })
  const handleBodyPatternChange = (value: DotType) => {
    const optionName = patternList[pattern].name as keyof Options
    setQrOptions((prev) => ({
      ...prev,
      [optionName]: {
        // @ts-ignore

        ...prev[optionName],
        type: value,
      },
    }))
    setValue(
      'qr_customize_options',
      {
        ...qrOptions,
        [optionName]: {
          // @ts-ignore
          ...qrOptions[optionName],
          type: value,
        },
      },
      {
        shouldDirty: true,
      }
    )
  }
  const handleMixedEyePatternChange = (value: DotType) => {
    const [squareOpt, dotOpt] = patternList['mix_eye_border_dot'].name as [
      keyof Options,
      keyof Options
    ]
    setQrOptions((prev) => ({
      ...prev,
      [squareOpt]: {
        // @ts-ignore
        ...prev[squareOpt],
        type: value,
      },
      [dotOpt]: {
        // @ts-ignore
        ...prev[dotOpt],
        type: value,
      },
    }))
    setValue(
      'qr_customize_options',
      {
        ...qrOptions,
        [squareOpt]: {
          // @ts-ignore
          ...qrOptions[squareOpt],
          type: value,
        },
        [dotOpt]: {
          // @ts-ignore
          ...qrOptions[dotOpt],
          type: value,
        },
      },
      {
        shouldDirty: true,
      }
    )
  }
  return (
    <div className="h-full">
      <Card className="h-full shadow-none border-slate-100 p-0">
        <CardContent className={pattern === 'body' ? 'p-0' : 'h-full p-0'}>
          <div className="flex flex-col gap-3 h-full">
            <div className="flex flex-col gap-2">
              <CardHeader className="p-0">
                <CardTitle className="text-slate-700 text-[15px] leading-[22px] font-medium">
                  {patternList[pattern].title}
                </CardTitle>
              </CardHeader>
              <div
                className={cn(
                  'flex gap-2',
                  pattern === 'body'
                    ? 'flex-wrap'
                    : 'overflow-x-auto scrollbar scrollbar-thin scrollbar-track-slate-300'
                )}
              >
                {patternList[pattern].pattern.map((p: PatternItem) => {
                  const value = p.value
                  const cornersDotOptions =
                    typeof value === 'string' ? value : value.cornersDotOptions
                  const cornersSquareOptions =
                    typeof value === 'string' ? value : value.cornersSquareOptions

                  return (
                    <NextImage
                      key={p.id}
                      className={cn(
                        'border border-gray-200 rounded-md cursor-pointer hover:border-primary m-0 p-1 w-[36px]! h-[36px]!',
                        patternList[pattern].itemSize,
                        pattern === 'body' &&
                          qrOptions?.dotsOptions?.type === value &&
                          'border-primary',
                        pattern === 'mix_eye_border_dot' &&
                          (qrOptions?.cornersDotOptions?.type === cornersDotOptions ||
                            qrOptions?.cornersSquareOptions?.type === cornersSquareOptions) &&
                          'border-primary'
                      )}
                      onClick={() => {
                        if (pattern === 'mix_eye_border_dot') {
                          const value =
                            typeof p.value === 'string' ? p.value : p.value.cornersDotOptions // ✅ pick string only
                          handleMixedEyePatternChange(value as DotType)
                        } else {
                          handleBodyPatternChange(p.value as DotType)
                        }
                      }}
                      loading="lazy"
                      src={p.image}
                      alt={p.name}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

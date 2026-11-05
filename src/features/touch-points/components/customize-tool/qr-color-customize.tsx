'use client'

import { DebouncedPicker } from '@/shared/components/customize/debounce-colorpicker'
import { CardHeader, CardTitle } from '@/shared/components/ui/card'
import { ColorMode, EYE_DOT, BODY_PATTERN, EYE_BORDER } from '@/shared/constants/utils'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { updateQrCustomizeOptionsSchema } from '@/shared/schemas/touch-points'
import type { Options } from 'qr-code-styling'
import React, { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'

type QrColorCustomizeProps = {
  pattern: 'body' | 'eye_border' | 'eye_dot' | 'all'
  color: string
}

type PatternItem = {
  pattern: { id: string; name: string; value: string; image: any }[]
  name: keyof Options
  itemSize: string
  title: string
}

const patternList: {
  body: PatternItem
  eye_border: PatternItem
  eye_dot: PatternItem
  all: PatternItem[]
} = {
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
    title: 'External Eye Patterns',
  },
  eye_dot: {
    pattern: EYE_DOT,
    name: 'cornersDotOptions',
    itemSize: 'w-[38px] h-[38px]',
    title: 'Internal Eye Patterns',
  },
  all: [
    {
      pattern: BODY_PATTERN,
      name: 'dotsOptions',
      itemSize: 'w-[100px] h-[100px]',
      title: 'Body Pattern:',
    },
    {
      pattern: EYE_BORDER,
      name: 'cornersSquareOptions',
      itemSize: 'w-[38px] h-[38px]',
      title: 'External Eye Patterns',
    },
    {
      pattern: EYE_DOT,
      name: 'cornersDotOptions',
      itemSize: 'w-[38px] h-[38px]',
      title: 'Internal Eye Patterns',
    },
  ],
}

export const QrColorCustomize = ({ pattern, color }: QrColorCustomizeProps) => {
  const { qrOptions, setQrOptions } = useQrContext()
  const { setValue } = useFormContext<z.infer<typeof updateQrCustomizeOptionsSchema>>()
  const [bodyColorMode, setBodyColorMode] = useState<ColorMode>(ColorMode.single)

  const applyColorChange = (optionNames: (keyof Options)[], newColor: string) => {
    const updated = { ...qrOptions }
    optionNames.forEach((name) => {
      updated[name] = {
        // @ts-ignore
        ...updated[name],
        color: bodyColorMode === ColorMode.single ? newColor : undefined,
      }
    })
    setQrOptions(updated)
    setValue('qr_customize_options', updated, { shouldDirty: true })
  }

  const handleColorChange = (newColor: string) => {
    if (pattern === 'all') {
      const allNames = patternList.all.map((p) => p.name)
      applyColorChange(allNames, newColor)
    } else {
      applyColorChange([patternList[pattern].name], newColor)
    }
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <CardHeader className="p-0">
        <CardTitle className="text-slate-700 text-[15px] leading-[22px] font-semibold">
          Color:
        </CardTitle>
      </CardHeader>

      <div className="col-span-3">
        {bodyColorMode === ColorMode.single && (
          <div className="w-full h-auto flex">
            <DebouncedPicker
              color={qrOptions.dotsOptions?.color || color || '#222222'}
              onChange={handleColorChange}
              offset={0}
            />
          </div>
        )}
      </div>
    </div>
  )
}

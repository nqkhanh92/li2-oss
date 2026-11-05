'use client'

import { Card, CardContent, CardFooter } from '@/shared/components/ui/card'
import NextImage from 'next/image'
import React from 'react'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { EYE_BORDER, EYE_DOT, BODY_PATTERN } from '@/shared/constants/utils'
import { Label } from '@/shared/components/ui/label'
import { Tooltip } from '@/shared/components/ui/tooltip'

const PATTERN = {
  body: {
    key: 'dotsOptions',
    items: BODY_PATTERN,
    label: 'Body Pattern',
    layoutClass: 'flex w-full gap-3',
    childClass: 'flex w-full gap-3',
  },
  eyeBorder: {
    key: 'cornersSquareOptions',
    items: EYE_BORDER,
    label: 'Eye Border',
    layoutClass: 'flex flex-row flex-wrap gap-3',
    childClass: 'grid grid-cols-2 gap-2 w-full',
  },
  eyeDot: {
    key: 'cornersDotOptions',
    items: EYE_DOT,
    label: 'Eye Dot',
    layoutClass: 'flex flex-row flex-wrap gap-3',
    childClass: 'grid grid-cols-2 gap-2 w-full',
  },
}

export default function QrPattern({ pattern }: { pattern: 'eyeBorder' | 'eyeDot' | 'body' }) {
  const eyeKey = PATTERN[pattern].key
  const patternItems = PATTERN[pattern].items

  return (
    <Card className="rad-shadow">
      <CardContent>
        <RadioGroup orientation="horizontal">
          <Label htmlFor="option-one">{PATTERN[pattern].label}</Label>
          {patternItems.map((p) => (
            <RadioGroupItem key={p.id} value={p.value} className="not-prose">
              <Tooltip delayDuration={0}>
                <NextImage className="opacity-1" loading="lazy" src={p.image} alt={p.name} />
              </Tooltip>
            </RadioGroupItem>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter>
        <div className="flex flex-col gap-4 w-full">
          <RadioGroup orientation="horizontal">
            <RadioGroupItem value="single">Single</RadioGroupItem>
            <RadioGroupItem value="gradient">Gradient</RadioGroupItem>
          </RadioGroup>
        </div>
      </CardFooter>
    </Card>
  )
}

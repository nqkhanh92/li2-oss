import { cn } from '@/shared/lib/cn'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { cva, VariantProps } from 'class-variance-authority'
import { useMemo, useState } from 'react'

const variants = cva('', {
  variants: {
    size: {
      default:
        '[&_#title]:h-[26px] [&_#description]:h-3 [&_#footer]:h-3 [&_.skeleton-body-part]:min-h-[8px]',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

interface Props
  extends Omit<React.ComponentProps<typeof Card>, 'title' | 'description'>,
    VariantProps<typeof variants> {
  title?: boolean
  description?: boolean

  bodyParts?: number
  bodyPartOrientation?: 'vertical' | 'horizontal'

  footer?: boolean

  className?: string
}

export const SkeletonCard = ({
  title = true,
  description = true,
  bodyParts = 1,
  bodyPartOrientation = 'vertical',
  size,

  footer = true,
  className,
  ...rest
}: Props) => {
  const [descriptionParts] = useState(() => Math.floor(Math.random() * 3) + 1)
  return (
    <Card className={cn(variants({ size }), className)} {...rest}>
      <CardHeader>
        {title && (
          <CardTitle id="title">
            <Skeleton
              className="rounded-[8px] h-full"
              style={{
                width: `${descriptionParts * 10}%`,
              }}
            />
          </CardTitle>
        )}
        {description && (
          <CardDescription id="description" className="flex gap-2">
            {Array.from({ length: descriptionParts }, (_, index) => (
              <div key={index} className="flex gap-1 h-full">
                <Skeleton className="w-[30px] rounded-[8px] h-full" />
                <Skeleton className="w-3 rounded-[8px] h-full" />
              </div>
            ))}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="w-full h-[calc(100%-128px)]">
        <div
          className={cn(
            'flex w-full h-full',
            bodyPartOrientation === 'vertical' ? 'flex-col' : 'flex-row',
            bodyParts > 1 ? 'gap-4' : ''
          )}
        >
          {Array.from({ length: bodyParts }, (_, index) => (
            <Skeleton
              key={`body-${index}`}
              className={cn('skeleton-body-part flex-1 w-full rounded-[8px]')}
            />
          ))}
        </div>
      </CardContent>
      {footer && (
        <CardFooter className="flex gap-2 justify-center">
          {Array.from({ length: descriptionParts }, (_, index) => (
            <div id="footer" key={index} className="flex gap-1">
              <Skeleton className="w-[50px] rounded-[8px] h-full" />
              <Skeleton className="w-3 rounded-[8px] h-full" />
            </div>
          ))}
        </CardFooter>
      )}
    </Card>
  )
}

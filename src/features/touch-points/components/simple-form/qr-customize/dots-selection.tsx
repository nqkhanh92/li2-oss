import { DotType } from 'qr-code-styling'
import Image from 'next/image'
import BodySquareSvg from '@/features/touch-points/constants/pattern/body-pattern-material/body_square.svg'
import BodyRoundedSvg from '@/features/touch-points/constants/pattern/body-pattern-material/body_rounded.svg'
import BodyDotsSvg from '@/features/touch-points/constants/pattern/body-pattern-material/body_dots.svg'
import BodyClassySvg from '@/features/touch-points/constants/pattern/body-pattern-material/body_classy.svg'
import BodyExtraRoundedSvg from '@/features/touch-points/constants/pattern/body-pattern-material/body_extra_rounded.svg'
import BodyClassyRoundedSvg from '@/features/touch-points/constants/pattern/body-pattern-material/body_classy_rounded.svg'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { QrOptions } from '@/features/touch-points/constants/qr'
import { cn } from '@/shared/lib/utils'

export const dotsTypes: {
  id: DotType
  name: string
  component: React.ReactNode
}[] = [
  {
    id: 'square',
    name: 'Square',
    component: <Image src={BodySquareSvg} alt="Square" width={21} height={21} />,
  },
  {
    id: 'rounded',
    name: 'Rounded',
    component: <Image src={BodyRoundedSvg} alt="Rounded" width={21} height={21} />,
  },
  {
    id: 'dots',
    name: 'Dots',
    component: <Image src={BodyDotsSvg} alt="Dots" width={21} height={21} />,
  },
  {
    id: 'classy',
    name: 'Classy',
    component: <Image src={BodyClassySvg} alt="Classy" width={21} height={21} />,
  },
]

export const dotsTypeInCreateTP: {
  id: DotType
  name: string
  component: React.ReactNode
}[] = [
  {
    id: 'square',
    name: 'Square',
    component: <Image src={BodySquareSvg} alt="Square" width={21} height={21} />,
  },
  {
    id: 'rounded',
    name: 'Rounded',
    component: <Image src={BodyRoundedSvg} alt="Rounded" width={21} height={21} />,
  },
  {
    id: 'dots',
    name: 'Dots',
    component: <Image src={BodyDotsSvg} alt="Dots" width={21} height={21} />,
  },
  {
    id: 'classy',
    name: 'Classy',
    component: <Image src={BodyClassySvg} alt="Classy" width={21} height={21} />,
  },
  {
    id: 'classy-rounded',
    name: 'Classy Rounded',
    component: <Image src={BodyClassyRoundedSvg} alt="Classy rounded" width={21} height={21} />,
  },
  {
    id: 'extra-rounded',
    name: 'Extra Rounded',
    component: <Image src={BodyExtraRoundedSvg} alt="Extra rounded" width={21} height={21} />,
  },
]

export const DotsSelection = ({
  isInCreate = false,
  onPatternSelect,
  qrOptionsTemp,
}: {
  isInCreate?: boolean
  onPatternSelect?: (patternId: DotType) => void
  qrOptionsTemp?: QrOptions
}) => {
  const { qrOptions, setQrOptions } = useQrContext()

  const handlePatternSelect = (patternId: DotType) => {
    setQrOptions((pre) => {
      if (pre.dotsOptions?.type !== patternId) {
        return {
          ...pre,
          dotsOptions: { ...pre.dotsOptions, type: patternId },
        }
      }
      return pre
    })
  }

  const dotsTypesToShow = isInCreate ? dotsTypeInCreateTP : dotsTypes

  return (
    <div className="flex flex-wrap gap-3">
      {dotsTypesToShow.map((pattern) => {
        const isSelected = qrOptionsTemp
          ? qrOptionsTemp.dotsOptions?.type === pattern.id
          : qrOptions.dotsOptions?.type === pattern.id

        return (
          <button
            type="button"
            key={pattern.id}
            title={pattern.name}
            onClick={() =>
              onPatternSelect ? onPatternSelect(pattern.id) : handlePatternSelect(pattern.id)
            }
            className={cn(
              'size-9 flex items-center justify-center rounded-[6px] border overflow-clip p-[6px] transition-colors hover:border-slate-900',
              isSelected ? 'border-teriaty' : 'border-slate-300'
            )}
          >
            {pattern.component}
          </button>
        )
      })}
    </div>
  )
}

import { CornerSquareType, CornerDotType } from 'qr-code-styling'

import Image from 'next/image'
import EyeCircleCircle from '@/features/touch-points/constants/pattern/mix_eye_border_dot/eye-circle-circle.svg'
import EyeRoundRound from '@/features/touch-points/constants/pattern/mix_eye_border_dot/eye-corner-square.svg'
// import EyeExtraRound from "@/public/icons/eye-extra-rounded.svg";
import EyeLeafLeaf from '@/features/touch-points/constants/pattern/mix_eye_border_dot/eye-leaf-leaf.svg'
import EyeSquareSquare from '@/features/touch-points/constants/pattern/mix_eye_border_dot/eye-squares-square.svg'
import EyeLeafCircle from '@/features/touch-points/constants/pattern/mix_eye_border_dot/eye-leaf-circle.svg'
import EyeLeafSquare from '@/features/touch-points/constants/pattern/mix_eye_border_dot/eye-leaf-square.svg'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { QrOptions } from '@/features/touch-points/constants/qr'
import { cn } from '@/shared/lib/utils'

export const cornersSquareTypes: {
  id: string
  name: string
  icon: any
}[] = [
  { id: 'square-square', name: 'Square Square', icon: EyeSquareSquare },
  { id: 'extra-rounded', name: 'Extra Rounded', icon: EyeRoundRound },
  { id: 'circle-circle', name: 'Circle Circle', icon: EyeCircleCircle },
  { id: 'leaf-leaf', name: 'Leaf Leaf', icon: EyeLeafLeaf },
]

export const cornersSquareTypesInCreate = [
  ...cornersSquareTypes,
  { id: 'leaf-circle', name: 'Leaf Circle', icon: EyeLeafCircle },
  { id: 'leaf-square', name: 'Leaf Square', icon: EyeLeafSquare },
]

export const parsepatternId = (
  id: string
): {
  border: CornerSquareType
  eye: CornerDotType
} => {
  switch (id) {
    case 'square-square':
      return { border: 'square', eye: 'square' }
    case 'extra-rounded':
      return { border: 'extra-rounded', eye: 'dot' }
    case 'circle-circle':
      return { border: 'dot', eye: 'dot' }
    case 'leaf-leaf':
      return { border: 'classy-rounded', eye: 'square' }
    case 'leaf-circle':
      return { border: 'classy-rounded', eye: 'dot' }
    case 'leaf-square':
      return { border: 'classy-rounded', eye: 'rounded' }
    default:
      return { border: 'square', eye: 'square' }
  }
}

export const CornersSquareSelection = ({
  isInCreate = false,
  onPatternSelect,
  qrOptionsTemp,
}: {
  isInCreate?: boolean
  onPatternSelect?: (patternId: string) => void
  qrOptionsTemp?: QrOptions
}) => {
  const { qrOptions, setQrOptions } = useQrContext()

  const handlePatternSelect = (patternId: string) => {
    const pattern = parsepatternId(patternId)
    setQrOptions((pre) => {
      if (
        pre.cornersSquareOptions?.type !== pattern.border ||
        pre.cornersDotOptions?.type !== pattern.eye
      ) {
        return {
          ...pre,
          cornersSquareOptions: { ...pre.cornersSquareOptions, type: pattern.border },
          cornersDotOptions: { ...pre.cornersDotOptions, type: pattern.eye },
        }
      }
      return pre
    })
  }

  const cornersSquareTypesToShow = isInCreate ? cornersSquareTypesInCreate : cornersSquareTypes

  return (
    <div className="flex flex-wrap gap-3">
      {cornersSquareTypesToShow.map((pattern) => {
        const isSelected = qrOptionsTemp
          ? qrOptionsTemp.cornersSquareOptions?.type === parsepatternId(pattern.id).border &&
            qrOptionsTemp.cornersDotOptions?.type === parsepatternId(pattern.id).eye
          : qrOptions.cornersSquareOptions?.type === parsepatternId(pattern.id).border &&
            qrOptions.cornersDotOptions?.type === parsepatternId(pattern.id).eye

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
            <Image src={pattern.icon} alt={pattern.name} width={21} height={21} />
          </button>
        )
      })}
    </div>
  )
}

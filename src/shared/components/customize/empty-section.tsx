import { cva, VariantProps } from 'class-variance-authority'
import { PackageOpenIcon } from 'lucide-react'
import { NoDataIcon } from '../icons/no-data-icon'

export const variants = cva('', {
  variants: {
    variant: {
      default:
        'rounded-[8px] text-slate-500 font-medium shadow-none border-none outline-hidden placeholder:text-slate-400',
    },
    size: {
      md: '[&_.container]:p-6 [&_svg]:w-28 [&_svg]:h-28 [&_svg]:mb-3 [&_h3]:text-xl [&_h3]:font-medium [&_p]:text-base [&_.action]:mt-4',
      default:
        '[&_.container]:p-6 [&_svg]:w-16 [&_svg]:h-16 [&_svg]:mb-3 [&_h3]:text-xl [&_h3]:font-medium [&_p]:text-base [&_.action]:mt-4',
      sm: '[&_.container]:p-4 [&_svg]:w-10 [&_svg]:h-10 [&_svg]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_p]:text-sm [&_.action]:text-sm [&_.action]:mt-2',
      lg: '[&_.container]:pt-4 [&_.container]:pb-9 [&_svg]:w-60 [&_svg]:h-60 [&_svg]:mb-3 [&_h3]:text-2xl [&_h3]:font-medium [&_p]:text-lg [&_.action]:mt-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})
type Props = VariantProps<typeof variants> & {
  title?: string
  description?: string
  action?: React.ReactNode
  IconComponent?: React.ReactNode
}
export const EmptySection = ({
  title = 'No data available',
  description = 'There are no items to display at this time.',
  action,
  IconComponent = <NoDataIcon />,
  size,
  variant,
}: Props) => {
  return (
    <div
      className={`${variants({
        size,
        variant,
      })} w-full h-full flex items-center justify-center`}
    >
      <div
        className={`container w-full h-full flex flex-col items-center justify-center rounded-lg text-center`}
      >
        <div className={`text-gray-400 icon`}>{IconComponent}</div>
        <h3 className={`title dark:text-gray-100`}>{title}</h3>
        <p className={`desc text-gray-500 dark:text-gray-400`}>{description}</p>
        {action && <div className={'action'}>{action}</div>}
      </div>
    </div>
  )
}

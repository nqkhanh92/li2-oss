import { cn } from '@/shared/lib/utils'
import { cva, VariantProps } from 'class-variance-authority'

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      default: '',
      link: 'text-primary hover:text-primary/80 cursor-pointer',
    },
    size: {
      default: 'text-inherit',
      xs: 'text-[0.75rem] leading-[1rem]',
      s: 'text-[0.875rem] leading-[1.25rem]',
      sm: 'text-[0.9375rem] leading-[1.375rem]',
      base: 'text-[1rem] leading-[1.5rem]',
      l: 'text-[1.125rem] leading-[1.625rem]',
      xl: 'text-[1.25rem] leading-[1.75rem]',
    },
    weight: {
      default: 'font-inherit',
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    weight: 'default',
    variant: 'default',
    size: 'default',
  },
})
type Component = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'a'
type TypographyProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof textVariants> & {
    component?: Component
  }
export const Typography = ({
  variant,
  size,
  weight,
  children,
  className,
  component: Component = 'p',
  ...props
}: TypographyProps) => {
  return (
    <Component {...props} className={cn(textVariants({ variant, size, weight }), className)}>
      {children}
    </Component>
  )
}

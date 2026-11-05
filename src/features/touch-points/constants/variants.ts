import { cva } from 'class-variance-authority'

export const inputVariants = cva(
  'outline-hidden ring-0 rounded-[8px] shadow-none placeholder:italic',
  {
    variants: {
      variant: {
        default:
          'bg-slate-100 text-foreground placeholder:text-slate-400 hover:border focus:border-slate-600! focus-within:border-slate-600! disabled:bg-neutral-500 data-[state=open]:border-slate-600',
        dashed: 'border-dashed border-slate-400 bg-inherit text-muted-foreground',
        muted: 'bg-inherit bg-slate-100 text-foreground outline-hidden placeholder:text-slate-400',
      },
      size: {
        default: 'min-h-10 max-h-36 px-4 py-2 text-sm font-normal',
        sm: 'h-10 rounded-md px-3 text-sm font-normal [&_.lucide]:w-5! [&_.lucide]:h-5!',
        xs: 'h-8 px-2 text-xs font-normal',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export const filterVariants = cva('placeholder:not-italic', {
  variants: {
    variant: {
      default:
        'border border-slate-300 [&_svg]:text-slate-600 text-slate-600 hover:bg-slate-50 focus:bg-slate-50 hover:border-slate-400 focus:border-slate-400 hover:text-foreground! focus:text-foreground! bg-card data-[has-value=true]:border-[1.5px] data-[has-value=true]:border-primary',
      input: 'bg-transparent border-slate-300! border! text-foreground placeholder:text-slate-600',
      muted: '',
      design_v2:
        'border-none outline-none shadow-none bg-slate-100 text-foreground [&_svg]:text-slate-600 hover:bg-slate-100 hover:text-foreground',
    },
    size: {
      default: 'h-10 px-4 py-[10px] text-[14px] font-normal leading-[20px]',
      icon: 'h-10 px-[10px] py-[10px] flex items-center text-center',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export const labelVariant = cva('', {
  variants: {
    variant: {
      default: 'text-foreground text-s',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

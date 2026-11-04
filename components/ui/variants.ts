import { cva } from 'class-variance-authority'

/** Port từ `li2-app/src/features/touch-points/constants/variants.ts` — giữ đúng biến thể input
 * của bản thương mại để ô nhập trông y hệt. Chỉ lấy `inputVariants`, không kéo cả feature. */

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

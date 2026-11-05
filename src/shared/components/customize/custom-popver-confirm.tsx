import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'

type CustomPopoverConfirmProps = {
  children?: React.ReactNode
  button?: React.ReactNode
  onConfirm?: () => void
  title?: string
}
export const CustomPopoverConfirm = ({
  children,
  button,
  onConfirm,
  title,
}: CustomPopoverConfirmProps) => {
  const [open, setOpen] = useState(false)
  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="w-full">
        {button || <Button type="button">Delete</Button>}
      </PopoverTrigger>
      <PopoverContent>
        {children || (
          <>
            {title || <div>This action cannot be undone, are you sure?</div>}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpen(false)} size={'sm'} variant="outline">
                Cancel
              </Button>
              <Button
                variant={'destructive'}
                size={'sm'}
                type="button"
                onClick={() => {
                  onConfirm?.()
                  setOpen(false)
                }}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

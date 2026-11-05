import { HelpCircleIcon } from 'lucide-react'
import { CustomToolTip } from './custom-tooltip'

type Props = {
  icon?: React.ReactElement
  description: string
}
export const HelperTooltip = ({ icon, description }: Props) => {
  return (
    <CustomToolTip content={description}>
      {icon || <HelpCircleIcon className="w-4 h-4 text-secondary-blue" />}
    </CustomToolTip>
  )
}

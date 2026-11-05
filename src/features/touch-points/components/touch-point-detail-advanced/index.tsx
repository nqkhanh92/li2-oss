import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { TouchPointAdvancedMenu } from './menu'

export const TouchPointAdvanced = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  return (
    <div className="flex h-full">
      <TouchPointAdvancedMenu />
    </div>
  )
}

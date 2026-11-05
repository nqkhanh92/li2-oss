import { BaseHandle } from '@/ee/features/campaigns/components/base-handle'
import { BaseWrapper } from '../base-wrapper'
import { Handle, NodeProps, Position } from '@xyflow/react'
import { SplitSquareHorizontal } from 'lucide-react'

type NodeWrapperProps = {
  children: React.ReactNode
} & NodeProps
export const ConditionNodeWrapper = ({ children, ...props }: NodeWrapperProps) => {
  return (
    <BaseWrapper
      icon={<SplitSquareHorizontal size={14} />}
      title="Condition"
      color="blue"
      handles={[
        {
          name: 'target-1',
          position: Position.Top,
          visible: true,
          disabled: false,
          type: 'target',
        },
        {
          name: 'true-1',
          position: Position.Bottom,
          visible: true,
          disabled: false,
          type: 'source',
          className: 'left-[25%]! translate-x-[-50%]! translate-y-[50%]',
          title: 'True',
        },
        {
          name: 'false-1',
          position: Position.Bottom,
          visible: true,
          disabled: false,
          type: 'source',
          className: 'left-[75%]! translate-x-[-50%]! translate-y-[50%]',
          title: 'False',
        },
      ]}
      {...props}
    >
      <div className="pb-4">{children}</div>
    </BaseWrapper>
  )
}

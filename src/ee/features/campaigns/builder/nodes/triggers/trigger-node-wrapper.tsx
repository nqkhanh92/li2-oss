import { BaseHandle } from '@/ee/features/campaigns/components/base-handle'
import { BaseNode } from '@/ee/features/campaigns/components/base-node'
import { NodeProps, Position } from '@xyflow/react'
import { Play, Settings } from 'lucide-react'
import { useState } from 'react'
import { BaseWrapper } from '../base-wrapper'

type NodeWrapperProps = {
  children: React.ReactNode
} & NodeProps
export const TriggerNodeWrapper = ({ children, ...props }: NodeWrapperProps) => {
  return (
    <BaseWrapper
      color="purple"
      icon={<Play size={14} />}
      title="Trigger"
      {...props}
      handles={[
        {
          name: 'source-1',
          position: Position.Bottom,
          visible: true,
          disabled: false,
          type: 'source',
        },
      ]}
    >
      {children}
    </BaseWrapper>
  )
}

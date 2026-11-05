import { BaseHandle } from '@/ee/features/campaigns/components/base-handle'
import { BaseNode } from '@/ee/features/campaigns/components/base-node'
import { HandleType, NodeProps, Position } from '@xyflow/react'
import { Settings } from 'lucide-react'
import { useState } from 'react'
import { useBuilder } from '../builder-context-provider'
import { CustomNodeInstance, CustomNodeType, NodeType } from './type'
import { cn } from '@/shared/lib/cn'
import { LabeledHandle } from '@/ee/features/campaigns/components/labeled-handle'
type HandleObject = {
  position: Position
  name: string
  visible: boolean
  disabled: boolean
  type: HandleType
  className?: string
  title?: string
}
type NodeWrapperProps = {
  children: React.ReactNode
  color?: keyof typeof colorSchemes
  icon?: React.ReactNode
  title?: string
  handles?: HandleObject[]
} & NodeProps
export const colorSchemes = {
  purple: {
    gradient: 'bg-linear-to-r from-violet-500 to-purple-600',
    border: 'border-violet-500!',
    hoverBorder: 'border-violet-300!',
    shadow: 'shadow-violet-200',
    hoverShadow: 'shadow-violet-100',
    handleBorder: 'border-violet-500!',
    iconBg: 'bg-background/20!',
    selectedHandleBg: 'bg-violet-500! border-white!',
  },
  blue: {
    gradient: 'bg-linear-to-r from-blue-500 to-indigo-600',
    border: 'border-blue-500!',
    hoverBorder: 'border-blue-300!',
    shadow: 'shadow-blue-200',
    hoverShadow: 'shadow-blue-100',
    handleBorder: 'border-blue-500!',
    iconBg: 'bg-background/20!',
    selectedHandleBg: 'bg-blue-500! border-white!',
  },
  green: {
    gradient: 'bg-linear-to-r from-emerald-500 to-green-600',
    border: 'border-emerald-500!',
    hoverBorder: 'border-emerald-300!',
    shadow: 'shadow-emerald-200',
    hoverShadow: 'shadow-emerald-100',
    handleBorder: 'border-emerald-500!',
    iconBg: 'bg-background/20!',
    selectedHandleBg: 'bg-emerald-500! border-white!',
  },
}
export const BaseWrapper = ({
  children,
  color = 'purple',
  icon,
  title,
  handles,
  ...props
}: NodeWrapperProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const { setSelectedNodeId } = useBuilder()
  const scheme = colorSchemes[color]
  const { selected, id } = props
  return (
    <BaseNode
      onDoubleClick={(e) => {
        setSelectedNodeId(id)
      }}
      className={`p-0 relative rounded-md border-2 transition-all duration-200 shadow-lg ${
        selected
          ? `${scheme.border} ${scheme.shadow}`
          : isHovered
          ? `${scheme.hoverBorder} ${scheme.hoverShadow}`
          : 'border-slate-200'
      }`}
      style={{ minWidth: '220px', maxWidth: '360px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`${scheme.gradient} px-4 py-2 rounded-t-sm flex justify-between items-center`}
      >
        <div className="flex items-center gap-2">
          <div className={`${scheme.iconBg} p-1 rounded-full text-white`}>{icon}</div>
          <h3 className="text-white font-medium text-sm">{title}</h3>
        </div>
        <button className="text-white/70 hover:text-white transition-colors">
          <Settings size={20} onClick={() => setSelectedNodeId(id)} />
        </button>
      </div>
      <div className="bg-background p-3">
        {/* <div className="p-2 bg-slate-50 rounded-md border border-slate-100"> */}
        {children}
        {/* </div> */}
      </div>
      {handles?.map((handle) => (
        <BaseHandle
          title={handle.title}
          className={cn(
            `w-3! h-3! bg-background! rounded-full border-2 ${
              scheme.handleBorder
            } shadow-xs transition-all ${
              selected ? `${scheme.selectedHandleBg}` : 'bg-background!'
            }`
          )}
          positionClassName={handle.className}
          key={handle.name}
          id={handle.name}
          type={handle.type}
          position={handle.position}
        />
      ))}
    </BaseNode>
  )
}

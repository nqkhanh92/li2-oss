import { Node, useReactFlow } from '@xyflow/react'
import { CustomNodeInstance, nodes, nodeTypeMapping } from '../nodes/type'
import { Separator } from '@/shared/components/ui/separator'
import { Trash2, X } from 'lucide-react'
import { useBuilder } from '../builder-context-provider'

export const PropertiesForm = ({ instance }: { instance: CustomNodeInstance<any> }) => {
  const node = nodeTypeMapping[instance.type]
  const onSubmit = (data: any) => {
    // console.log(data);
  }
  const { setSelectedNodeId } = useBuilder()
  const { deleteElements } = useReactFlow()
  return (
    <div className="p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium text-slate-700">Properties</h2>
        <div className="flex items-center gap-2">
          <button className="text-slate-500 hover:text-red-500">
            <Trash2 size={16} onClick={() => deleteElements({ nodes: [{ id: instance.id }] })} />
          </button>
          <button className="text-slate-500 hover:text-slate-700">
            <X size={16} onClick={() => setSelectedNodeId(null)} />
          </button>
        </div>
      </div>
      <Separator className="my-2" />
      <node.FormProperties key={instance.id} {...instance} onSubmit={onSubmit} />
    </div>
  )
}

import { Node, NodeProps, useNodesData } from '@xyflow/react'
import { CustomNode, CustomNodeInstance, CustomNodeType, NodeGroup, NodeType } from '../type'
import { TriggerNodeWrapper } from './trigger-node-wrapper'
import { Play } from 'lucide-react'
import { PreviewWrapper } from '../preview-wrapper'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/shared/components/ui/input'
import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { useParams } from 'next/navigation'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { FancyMultiSelect } from '@/shared/components/customize/fancy-multi-select'
import { useBuilder } from '../../builder-context-provider'
import { Button } from '@/shared/components/ui/button'
import { useMemo } from 'react'
type Attributes = {
  affected_tags: string[]
  affected_ids: string[]
}
export type TouchPointInteractionNode = NodeType<Attributes>

const type: CustomNodeType = 'touch-point-interaction'
const group: NodeGroup = 'trigger'
const formSchema = z.object({
  affected_tags: z.array(z.string()),
  affected_ids: z.array(z.string()),
})

export const Component: React.FC<NodeProps<Node & { data: CustomNodeInstance<Attributes> }>> = (
  props
) => {
  const { data } = props
  const { org_id } = useParams<{ org_id: string }>()
  const { data: tags } = useGetTagDropdowns(org_id)
  const selectedTags = useMemo(() => {
    return tags?.filter((tag) => data.attributes.affected_tags.includes(tag.id))
  }, [tags, data.attributes.affected_tags])
  return (
    <TriggerNodeWrapper {...props}>
      <div className="space-y-2">
        <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
          <div className="text-sm font-medium text-slate-700">Touch Point Interaction</div>
          <div className="text-xs text-slate-500 mt-1">
            Triggers when user interact with touch point
          </div>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50">
          <span>Trigger type</span>
          <span className="font-medium text-slate-700">Touch Point Interaction</span>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50">
          <span>Affected tags</span>
          <span className="font-medium text-slate-700 overflow-hidden truncate max-w-[150px]">
            {selectedTags?.map((tag) => tag.name).join(', ') || 'Empty'}
          </span>
        </div>
      </div>
    </TriggerNodeWrapper>
  )
}

export const SidebarItem: React.FC = () => {
  return (
    <PreviewWrapper color="purple" title="Touch Point Interaction" icon={<Play size={14} />}>
      <div className="text-xs">Triggers on user interaction with touch point</div>
    </PreviewWrapper>
  )
}
export const FormProperties: React.FC<
  { onSubmit: (data: Attributes) => void } & CustomNodeInstance<Attributes>
> = ({ attributes, onSubmit, id }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: attributes,
  })
  const { updateNodeData, setSelectedNodeId } = useBuilder()
  const { org_id } = useParams<{ org_id: string }>()
  const { data: tags, isLoading: isLoadingTags } = useGetTagDropdowns(org_id)
  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    updateNodeData(id, data)
    setSelectedNodeId(null)
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => handleSubmit(data))}>
        <FormField
          control={form.control}
          name="affected_tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Affected Tags</FormLabel>
              <FormControl>
                <LoadingMask className="w-full" loading={isLoadingTags} skeleton>
                  <div>
                    <FancyMultiSelect
                      key={`tags-select-${tags?.length}`}
                      placeholder="Enter tag"
                      limit={10}
                      options={(tags || []).map((tag) => ({
                        label: tag.name,
                        value: tag.id,
                        color: tag.color,
                      }))}
                      variant="default"
                      {...field}
                    />
                  </div>
                </LoadingMask>
              </FormControl>
              <FormDescription>Select tags to apply this trigger</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end mt-4">
          <Button size="xs" type="submit">
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}

export const touchPointInteractionNode: CustomNode<Attributes> = {
  constructor: (id: string) => ({
    id,
    type,
    group,
    attributes: {
      affected_ids: [],
      affected_tags: [],
    },
  }),
  type,
  Component,
  SidebarItem,
  FormProperties,
}

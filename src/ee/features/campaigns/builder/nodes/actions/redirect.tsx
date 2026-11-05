// import { NodeProps } from "@xyflow/react";
import { ActionNodeType, CustomNode, CustomNodeInstance, NodeGroup } from '../type'
import { Node, NodeProps } from '@xyflow/react'
import { ActionNodeWrapper } from './action-node-wrapper'
import { PreviewWrapper } from '../preview-wrapper'
import { Zap } from 'lucide-react'
import { useBuilder } from '../../builder-context-provider'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
const formSchema = z.object({
  url: z.string().url().optional(),
})
const type: ActionNodeType = 'redirect'
type Attributes = {
  url: string | undefined
}
const group: NodeGroup = 'action'

export const Component: React.FC<NodeProps<Node & { data: CustomNodeInstance<Attributes> }>> = (
  props
) => {
  const { data } = props
  return (
    <ActionNodeWrapper {...props}>
      <div className="mt-3 space-y-2">
        <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
          <div className="text-sm font-medium text-slate-700">Redirect</div>
          <div className="text-xs text-slate-500 mt-1">Redirect user to URL</div>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50">
          <span>Action type</span>
          <span className="font-medium text-slate-700">Redirect</span>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50 gap-2">
          <span>URL</span>
          <span className="font-medium text-slate-700 truncate">
            {data.attributes.url || 'Not set'}
          </span>
        </div>
      </div>
    </ActionNodeWrapper>
  )
}

export const SidebarItem: React.FC = () => {
  return (
    <PreviewWrapper color="green" title="Redirect" icon={<Zap size={14} />}>
      <div className="text-xs">Redirect user to URL</div>
    </PreviewWrapper>
  )
}
export const FormProperties: React.FC<CustomNodeInstance<Attributes>> = ({
  attributes,
  group,
  id,
  type,
}) => {
  const { updateNodeData, setSelectedNodeId } = useBuilder()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: attributes,
  })
  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    updateNodeData(id, data)
    setSelectedNodeId(null)
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => handleSubmit(data))}>
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Enter URL" {...field} />
              </FormControl>
              {/* <FormDescription>
              Select interaction type to apply this trigger
            </FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        {JSON.stringify(form.formState.errors)}
        <div className="flex justify-end mt-4">
          <Button size="xs" type="submit">
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
export const redirectNode: CustomNode<Attributes> = {
  constructor: (id: string) => ({
    id,
    type,
    group,
    attributes: {
      url: undefined,
    },
  }),
  type,
  Component,
  SidebarItem,
  FormProperties,
}

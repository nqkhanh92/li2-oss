// import { NodeProps } from "@xyflow/react";
import { Node, NodeProps } from '@xyflow/react'
import { CustomNode, CustomNodeInstance, CustomNodeType, NodeGroup } from '../type'
import { ConditionNodeWrapper } from './condition-node-wrapper'
import { PreviewWrapper } from '../preview-wrapper'
import { SplitSquareHorizontal } from 'lucide-react'
import { ConditionInput } from './condition-input'
import { mappingTouchPointVariantInteractions } from '@/features/touch-points/types'
import { Button } from '@/shared/components/ui/button'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { useBuilder } from '../../builder-context-provider'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GroupCondition, mappingOperatorLabel } from './type'
import { ConditionGroupInput, groupConditionSchema } from './condition-group-input'
import {
  DataFieldType,
  interactionDeviceOs,
  interactionDeviceTypes,
} from '@/shared/types/campaigns'
import { mappingGroupOperatorLabel } from './constants'
type Attributes = {
  condition: GroupCondition
}
const defaultValues: Attributes = {
  condition: {
    type: 'group',
    operator: 'and',
    conditions: [],
  },
}

const type: CustomNodeType = 'interaction-condition'
const group: NodeGroup = 'condition'
const formSchema = z.object({
  condition: groupConditionSchema,
})
export const Component: React.FC<NodeProps<Node & { data: CustomNodeInstance<Attributes> }>> = (
  props
) => {
  const { data } = props
  return (
    <ConditionNodeWrapper {...props}>
      <div className="mt-3 space-y-2">
        <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
          <div className="text-sm font-medium text-slate-700">Interaction condition</div>
          <div className="text-xs text-slate-500 mt-1">
            Make a yes/no decision based on the interaction data
          </div>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50">
          <span>Mode</span>
          <span className="font-medium text-slate-700">
            {mappingGroupOperatorLabel[data.attributes.condition.operator].label}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50 truncate gap-2">
          <span>Description</span>
          <span className="font-medium text-slate-700">
            {mappingGroupOperatorLabel[data.attributes.condition.operator].description}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50">
          <span>Conditions</span>
          <span className="font-medium text-slate-700">
            {data.attributes.condition.conditions.length > 0
              ? data.attributes.condition.conditions.length
              : 'Empty'}
          </span>
        </div>
      </div>
    </ConditionNodeWrapper>
  )
}

export const SidebarItem: React.FC = () => {
  return (
    <PreviewWrapper
      color="blue"
      title="Interaction Condition"
      icon={<SplitSquareHorizontal size={14} />}
    >
      <div className="text-xs text-wrap">Make a yes/no decision based on the interaction data</div>
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
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interaction condition</FormLabel>
              <FormControl>
                <ConditionGroupInput
                  dataFields={[
                    {
                      label: 'Interaction Type',
                      value: 'interaction_type',
                      type: DataFieldType.SELECT,
                      options: Object.entries(mappingTouchPointVariantInteractions).map(
                        ([key, value]) => ({ value: key, label: value })
                      ),
                    },
                    {
                      label: 'Device OS',
                      value: 'device_os',
                      type: DataFieldType.SELECT,
                      options: Object.entries(interactionDeviceOs).map(([key, value]) => ({
                        value: value.value,
                        label: value.label,
                      })),
                    },
                    {
                      label: 'Device Type',
                      value: 'device_type',
                      type: DataFieldType.SELECT,
                      options: Object.entries(interactionDeviceTypes).map(([key, value]) => ({
                        value: value.value,
                        label: value.label,
                      })),
                    },
                    {
                      label: 'Interaction Count',
                      value: 'interaction_count',
                      type: DataFieldType.NUMBER,
                    },
                  ]}
                  maxFields={4}
                  form={form}
                />
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
export const interactionTypeNode: CustomNode<Attributes> = {
  constructor: (id: string) => ({
    id,
    type,
    group,
    attributes: defaultValues,
  }),
  type,
  Component,
  SidebarItem,
  FormProperties,
}

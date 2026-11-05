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
import { useGetIntegrationDropdowns } from '@/features/integrations/hooks/queries'
import { useParams } from 'next/navigation'
import {
  useGetParcelvoyEntrances,
  useGetParcelvoyJourneys,
} from '@/features/integrations/hooks/queries/parcelvoy'
import { Label } from '@/shared/components/ui/label'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { ExecutionTypeEnum, executionTypeMapping } from './type'
import { JsonBuilderV2 } from '../../components/json-builder-v2'
const formSchema = z.object({
  journey_id: z.string(),
  integration_id: z.string(),
  entrance_id: z.string(),
  data: z.object({}),
  data_fields: z.array(z.any()),
})
const type: ActionNodeType = 'trigger-parcelvoy-journey'
type Attributes = {
  integration_id: string
  journey_id: string
  entrance_id: string
  data: Record<string, unknown>
  data_fields: any[]
}
const group: NodeGroup = 'action'
const executionType: ExecutionTypeEnum = ExecutionTypeEnum.BACKGROUND

export const Component: React.FC<NodeProps<Node & { data: CustomNodeInstance<Attributes> }>> = (
  props
) => {
  const { data } = props
  return (
    <ActionNodeWrapper {...props}>
      <div className="mt-3 space-y-2">
        <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
          <div className="text-sm font-medium text-slate-700">Trigger Parcelvoy Journey</div>
          <div className="text-xs text-slate-500 mt-1">
            Trigger a Parcelvoy journey based on the interaction data
          </div>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50">
          <span>Execution type</span>
          <span className="font-medium text-slate-700">
            {executionTypeMapping[executionType].label}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50">
          <span>Description</span>
          <span className="font-medium text-slate-700">
            {executionTypeMapping[executionType].description}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50 gap-2">
          <span className="text-nowrap">Integration ID</span>
          <span className="font-medium text-slate-700 truncate">
            {data.attributes.integration_id || 'Not set'}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50 gap-2">
          <span className="text-nowrap">Journey ID</span>
          <span className="font-medium text-slate-700 truncate">
            {data.attributes.journey_id || 'Not set'}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 py-1 px-2 rounded-sm bg-slate-50 gap-2">
          <span className="text-nowrap">Entrance ID</span>
          <span className="font-medium text-slate-700 truncate">
            {data.attributes.entrance_id || 'Not set'}
          </span>
        </div>
      </div>
    </ActionNodeWrapper>
  )
}

export const SidebarItem: React.FC = () => {
  return (
    <PreviewWrapper color="green" title="Trigger Parcelvoy Journey" icon={<Zap size={14} />}>
      <div className="text-xs">Trigger a Parcelvoy journey based on the interaction data</div>
    </PreviewWrapper>
  )
}
export const FormProperties: React.FC<CustomNodeInstance<Attributes>> = ({
  attributes,
  group,
  id,
  type,
}) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { updateNodeData, setSelectedNodeId } = useBuilder()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: attributes,
  })
  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    updateNodeData(id, data)
    setSelectedNodeId(null)
  }
  const watchIntegrationId = form.watch('integration_id')
  const watchJourneyId = form.watch('journey_id')
  const { data: integrations, isLoading } = useGetIntegrationDropdowns(org_id)
  const { data: journeys, isLoading: journeysLoading } = useGetParcelvoyJourneys(
    org_id,
    watchIntegrationId
  )
  const { data: entrances, isLoading: entrancesLoading } = useGetParcelvoyEntrances(
    org_id,
    watchIntegrationId,
    watchJourneyId
  )
  const resetFormFields = (resetJourney?: boolean, resetEntrance?: boolean) => {
    if (resetJourney) {
      form.setValue('journey_id', '')
    }
    if (resetEntrance) {
      form.setValue('entrance_id', '')
    }
  }
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => handleSubmit(data))}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="integration_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Integration</FormLabel>
              <FormControl>
                <SingleCommandSelect
                  disabled={isLoading}
                  placeholder="Select integration"
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value)
                    resetFormFields(true, true)
                  }}
                  options={integrations?.map((integration) => ({
                    value: integration.id,
                    label: integration.name,
                  }))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingMask loading={journeysLoading}>
          <FormField
            control={form.control}
            name="journey_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Journey</FormLabel>
                <FormControl>
                  <SingleCommandSelect
                    disabled={!watchIntegrationId}
                    placeholder="Select journey"
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value)
                      resetFormFields(false, true)
                    }}
                    options={journeys?.map((journey) => ({
                      value: `${journey.id}`,
                      label: journey.name || 'No name',
                    }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </LoadingMask>
        <LoadingMask loading={entrancesLoading}>
          <FormField
            control={form.control}
            name="entrance_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entrance</FormLabel>
                <FormControl>
                  <SingleCommandSelect
                    disabled={!watchJourneyId}
                    placeholder="Select entrance"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    options={entrances?.map((entrance) => ({
                      value: `${entrance.id}`,
                      label: entrance.name || 'No name',
                    }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </LoadingMask>
        <FormField
          control={form.control}
          name="data_fields"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl>
                <JsonBuilderV2 fieldName={field.name} />
              </FormControl>
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
export const triggerParcelvoyJourneyNode: CustomNode<Attributes> = {
  constructor: (id: string) => ({
    id,
    type,
    group,
    attributes: {
      integration_id: '',
      journey_id: '',
      entrance_id: '',
      data: {
        user: {},
        event: {},
      },
      data_fields: [],
    },
  }),
  type,
  Component,
  SidebarItem,
  FormProperties,
}

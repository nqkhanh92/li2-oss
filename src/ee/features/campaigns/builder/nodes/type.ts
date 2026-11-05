import { Node, NodeProps, NodeTypes } from "@xyflow/react";
import { touchPointInteractionNode } from "./triggers/touch-point-interaction";
import { redirectNode } from "./actions/redirect";
import { interactionTypeNode } from "./conditions/interaction-condition";
import { triggerParcelvoyJourneyNode } from "./actions/trigger-parcelvoy-journey";

export type TriggerNodeType =
  | "touch-point-interaction"
  | "schedule"
  | "api-call";
export type ActionNodeType =
  | "call-api"
  | "redirect"
  | "trigger-parcelvoy-journey";
export type ConditionNodeType = "interaction-condition";

export type CustomNodeType =
  | TriggerNodeType
  | ActionNodeType
  | ConditionNodeType;
export type NodeGroup = "trigger" | "action" | "condition";

export type CustomNode<T> = {
  constructor: (id: string) => CustomNodeInstance<T>;
  type: CustomNodeType;
  Component: React.FC<NodeProps<Node & { data: CustomNodeInstance<T> }>>;
  SidebarItem: React.FC;
  FormProperties: React.FC<
    CustomNodeInstance<T> & { onSubmit: (data: T) => void }
  >;
};

export type CustomNodeInstance<T> = {
  id: string;
  type: CustomNodeType;
  group: NodeGroup;
  attributes: T;
};
export const triggerNodes = [touchPointInteractionNode];
export const conditionNodes = [interactionTypeNode];
export const actionNodes = [redirectNode, triggerParcelvoyJourneyNode];
export const nodes: CustomNode<any>[] = [
  ...triggerNodes,
  ...conditionNodes,
  ...actionNodes,
];
export const nodeTypeMapping = nodes.reduce((acc, node) => {
  acc[node.type] = node;
  return acc;
}, {} as Record<CustomNodeType, CustomNode<any>>);

export const nodeTypes: NodeTypes = nodes.reduce((acc, node) => {
  acc[node.type] = node.Component;
  return acc;
}, {} as Record<CustomNodeType, React.FC<any>>);

export type NodeType<T> = Node & { data: CustomNodeInstance<T> };

export enum ExecutionTypeEnum {
  DIRECT = "DIRECT",
  BACKGROUND = "BACKGROUND",
}

export const executionTypeMapping = {
  [ExecutionTypeEnum.DIRECT]: {
    action_name: "Direct Action",
    label: "Direct",
    description: "Execute action directly",
  },
  [ExecutionTypeEnum.BACKGROUND]: {
    action_name: "Background Action",
    label: "Background",
    description: "Execute action in background",
  },
};

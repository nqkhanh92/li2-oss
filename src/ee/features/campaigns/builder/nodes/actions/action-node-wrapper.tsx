import { NodeProps, Position } from "@xyflow/react";
import { BaseWrapper } from "../base-wrapper";
import { Link2, Zap } from "lucide-react";
type NodeWrapperProps = {
  children: React.ReactNode;
} & NodeProps;
export const ActionNodeWrapper = ({ children, ...props }: NodeWrapperProps) => {
  return (
    <BaseWrapper
      title="Action"
      icon={<Zap size={14} />}
      color="green"
      handles={[
        {
          disabled: false,
          name: "target-1",
          position: Position.Top,
          type: "target",
          visible: true,
        },
      ]}
      {...props}
    >
      {children}
    </BaseWrapper>
  );
};

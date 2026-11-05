import tool_1 from "@/public/images/tool_1.webp";
import tool_2 from "@/public/images/tool_2.webp";
import tool_3 from "@/public/images/tool_3.webp";
import tool_4 from "@/public/images/tool_4.webp";

export interface ToolConfig {
  id: number;
  icon: string;
  button: string;
  href: string;
  isComming?: boolean;
  special?: boolean;
}

export const TOOL_CONFIGS: ToolConfig[] = [
  {
    id: 1,
    icon: tool_2.src,
    button: "Short Link",
    special: true,
    href: "/org/${org_id}/short-links/create",
  },
  {
    id: 2,
    icon: tool_1.src,
    button: "QR Code",
    href: "/org/${org_id}/short-links/create?tp_type=qr",
  },
  {
    id: 3,
    icon: tool_3.src,
    button: "Landing Page",
    href: "/org/${org_id}/short-links/create",
    isComming: true,
  },
  {
    id: 4,
    icon: tool_4.src,
    button: "Campaign",
    href: "/org/${org_id}/short-links/create",
    isComming: true,
  },
];

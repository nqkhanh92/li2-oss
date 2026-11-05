import { z } from "zod";

export enum AssetType {
  NFC = "NFC",
  DIGITAL_SIGNAGE = "DIGITAL_SIGNAGE",
}

export const assetFormSchema = z.object({
  name: z.string().optional(),
  serial_number: z.string().min(2).max(64),
  type: z.nativeEnum(AssetType),
  status: z.enum(["enable", "disable"]).default("enable"),
});

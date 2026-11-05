"use server";
import { createClient } from "@/infrastructure/database/supabase/server";
type AssetDropdownItem = {
  id: string;
  name: string;
};
export const getAssetDropdown = async (org_id: string) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assets")
      .select("id, name")
      .eq("organization_id", org_id)
      .eq("is_warranty", false)
      .returns<AssetDropdownItem[]>();
    if (error) {
      throw error;
    }
    return data;
  } catch (error: any) {
    return [];
  }
};

"use client";
import { createClient } from "@/infrastructure/database/supabase/client";
import { Campaign } from "../api/organizations/[org_id]/campaigns/route";

export type CampaignDropdownData = {
  name: string;
  id: string;
}[];

export const getCampaignDropdown = async (org_id: string) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("organization_id", org_id)
      .returns<CampaignDropdownData>();
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

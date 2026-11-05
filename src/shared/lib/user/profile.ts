import { getSession } from "../auth/session";
import { createServiceClient } from "../../../infrastructure/database/supabase/server";
import { UserProfile } from "@/shared/providers/auth-provider";
export const getProfile = async (): Promise<UserProfile | null> => {
  try {
    const supabase = await createServiceClient();
    const session = await getSession();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session!.sub)
      .returns<UserProfile>()
      .single();
    if (error) {
      throw error;
    }
    return profile;
  } catch (error: any) {
    return null;
  }
};

import { getServiceClient } from "./server";

export const supabaseService =
  globalThis._supabaseService ?? getServiceClient();

if (process.env.NODE_ENV !== "production") {
  globalThis._supabaseService = supabaseService;
}

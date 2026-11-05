import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseJwt } from "./jwt";

export function createClient() {
  return createBrowserClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        //THIS IS WORKAROUND AND THE SUPABASE GET SESSION WILL NOT WORK WHEN WE DO THIS THING!
        //IF SUPABASE RELEASE THE FEATURE TO SIGN JWT TOKEN BY RS256, WE CAN REMOVE THIS THING!
        fetch: async (url, options = {}) => {
          // Get the customize supabase jwt token
          const token = await getSupabaseJwt();
          // Insert the custom supabase jwt token into the headers
          const headers = new Headers(options?.headers);
          headers.set("Authorization", `Bearer ${token}`);

          // Call the default fetch
          return fetch(url, {
            ...options,
            headers,
          });
        },
      },
    }
  );
}

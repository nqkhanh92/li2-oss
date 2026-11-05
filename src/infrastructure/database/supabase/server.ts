import { Database } from "@/shared/types/database.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseJwt } from "./jwt";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
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

export const createServiceClient = async () => {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};

export const getServiceClient = () => {
  return createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        persistSession: false, // Optional: ensures no cookies
        autoRefreshToken: false,
      },
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          return;
        },
      },
    }
  );
};

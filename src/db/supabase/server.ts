import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "@/db/supabase/database.types";

/** Typed Supabase client for this project's database schema */
export type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Creates a Supabase server client for use in API routes and Server Components.
 * Supports both cookie-based auth (browser) and Authorization header (API testing).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // Check for Authorization Bearer token (for API testing with curl)
  const authHeader = headerStore.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      // Pass Authorization header for API testing support
      ...(bearerToken && {
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      }),
    }
  );

  return client;
}

export const DEFAULT_USER_ID = "1904e4e8-db9a-435d-a881-2c460c715785";

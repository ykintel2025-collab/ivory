import { createClient } from "@supabase/supabase-js";

// Let op: dit gebruikt de SECRET service_role-sleutel, en mag daarom
// UITSLUITEND server-side aangeroepen worden (bijv. vanuit een API-route),
// nooit vanuit een client component of de browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

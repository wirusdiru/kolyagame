import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isCloudEnabled = Boolean(url && key && url.startsWith("http"));

let client: SupabaseClient | null = null;
let loadFailed = false;

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isCloudEnabled || loadFailed) return null;
  if (client) return client;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(url!, key!);
    return client;
  } catch {
    loadFailed = true;
    console.warn("Supabase: установи пакет — npm install @supabase/supabase-js");
    return null;
  }
}

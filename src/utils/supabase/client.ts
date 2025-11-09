import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          storageKey: 'supabase-auth-trackstar',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce'
        }
      }
    );
  }
  return supabaseClient;
}
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * The publishable key is intentionally in the client bundle — that is what a
 * publishable key is for. It grants only what row-level security allows, and it
 * already ships inside the deployed index.html today. Real protection is the RLS
 * policy on each table, not secrecy of this string.
 *
 * Both values can be overridden at build time for a different project, but they
 * default to the live one so the app works with no env setup.
 */
export const SUPABASE_URL =
  import.meta.env['VITE_SUPABASE_URL'] ?? 'https://coyvxupbwxhfzfoxgnzv.supabase.co';

export const SUPABASE_KEY =
  import.meta.env['VITE_SUPABASE_KEY'] ?? 'sb_publishable_lDcXtgZ8BQ_5f9FaCRn5_w_muShLVJg';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Read-only dashboard with no sign-in. Skipping session persistence avoids
    // touching localStorage and the URL for a flow that does not exist yet.
    persistSession: false,
    autoRefreshToken: false,
  },
});

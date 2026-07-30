/**
 * Connection settings for the PostgREST endpoint.
 *
 * WHY NOT @supabase/supabase-js: it was tried and dropped, with measurements.
 * The dashboard makes nine read-only selects, but the client pulls in
 * realtime-js, auth-js and storage-js regardless — 125 KB gzipped of JS against
 * 76 KB with plain fetch. A 49 KB saving, 39% of the bundle, for capabilities
 * nothing here uses.
 *
 * Type safety was never the reason to keep it: the generated `Database` types in
 * ./database.types.ts and the wire widening in ./wire.ts do that work, and both
 * are independent of the client library.
 *
 * If auth ever lands, add it back then — at that point it earns its weight.
 *
 * The publishable key is intentionally in the client bundle; that is what a
 * publishable key is for. It grants only what row-level security allows and it
 * already ships inside the deployed index.html. Real protection is the RLS
 * policy on each table, not secrecy of this string. Both values can be
 * overridden at build time, but default to the live project so the app runs
 * with no env setup.
 */
export const SUPABASE_URL =
  import.meta.env['VITE_SUPABASE_URL'] ?? 'https://coyvxupbwxhfzfoxgnzv.supabase.co';

export const SUPABASE_KEY =
  import.meta.env['VITE_SUPABASE_KEY'] ?? 'sb_publishable_lDcXtgZ8BQ_5f9FaCRn5_w_muShLVJg';

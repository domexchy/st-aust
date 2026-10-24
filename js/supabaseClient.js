// js/supabaseClient.js: Supabase Client Initializer
//
// Initializes the Supabase client using supabase-js v2 from CDN.
// Uses ONLY the public anon key (never service_role) to protect database security.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/**
 * Check whether the Supabase project URL and anon key have been configured by the user.
 */
export const isConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT_ID') &&
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
);

/**
 * Global Supabase Client instance.
 * Talk to Supabase services:
 * - Database queries: supabase.from('table_name').select(...)
 * - Auth sessions: supabase.auth.getSession(), supabase.auth.signInWithPassword(...)
 * - Storage: supabase.storage.from('bucket_name').upload(...)
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

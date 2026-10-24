/**
 * testConnection.js - Phase 2 Connection Verification Script
 * Logs a simple test query to confirm browser connection to Supabase.
 * Checks Row Level Security (RLS) to ensure only published rows are returned.
 */

import { supabase, isConfigured } from './supabaseClient.js';

export async function testSupabaseConnection() {
  console.group('🏫 St. Augustine Academy - Supabase Connection Check (Phase 2)');

  if (!isConfigured) {
    console.warn(
      '⚠️ Supabase credentials not set yet in js/config.js.\n' +
      'Please update SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js with your project credentials.'
    );
    console.groupEnd();
    return { success: false, reason: 'unconfigured' };
  }

  try {
    console.log('📡 Connecting to Supabase database...');

    // Supabase query: Select published news posts to verify anonymous read access under RLS
    const { data, error } = await supabase
      .from('news')
      .select('id, title, slug, summary, is_published, created_at')
      .eq('is_published', true)
      .limit(5);

    if (error) {
      console.error('❌ Supabase connection error:', error.message);
      console.info('💡 Tip: Ensure backend Phase 1 (tables) and Phase 2 (RLS & seeds) have been executed in your Supabase SQL editor.');
      console.groupEnd();
      return { success: false, error };
    }

    console.log('✅ Supabase connected successfully! Published sample rows:');
    if (data && data.length > 0) {
      console.table(data);
    } else {
      console.log('ℹ️ Connection successful, but no published rows returned. Seed your database using supabase/03_seed.sql.');
    }

    console.groupEnd();
    return { success: true, data };
  } catch (err) {
    console.error('❌ Unexpected error while communicating with Supabase:', err);
    console.groupEnd();
    return { success: false, error: err };
  }
}

// Automatically execute test connection when script runs
testSupabaseConnection();

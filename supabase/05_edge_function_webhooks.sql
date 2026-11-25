-- ============================================================================
-- 05_edge_function_webhooks.sql: Automated Email Alerts on New Submissions
-- 
-- PURPOSE:
-- Triggers the 'notify-school' Edge Function whenever:
-- 1. A visitor submits a contact form message (public.contact_messages)
-- 2. A parent submits an admission application (public.admission_applications)
--
-- The Edge Function generates a branded HTML email and delivers it to school staff.
-- ============================================================================

-- ============================================================================
-- HOW TO SET UP IN SUPABASE DASHBOARD (Recommended & Easiest)
-- ============================================================================
-- Step 1: Deploy the Edge Function
--   Using Supabase CLI in your project root:
--   supabase functions deploy notify-school
--
-- Step 2: Set Function Secrets (Optional for live outbound sending)
--   supabase secrets set RESEND_API_KEY=re_your_api_key
--   supabase secrets set SCHOOL_NOTIFICATION_EMAIL=admissions@staugustine.edu.ng
--
-- Step 3: Create Database Webhooks in Dashboard
--   1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/_/database/hooks
--   2. Click "Create a new webhook"
--   3. Webhook 1 (Contact Inquiries):
--      - Name: alert_new_contact_message
--      - Table: contact_messages
--      - Events: Insert (check only 'Insert')
--      - Type: Supabase Edge Functions
--      - Edge Function: notify-school
--      - HTTP Method: POST
--      - Click "Create webhook"
--
--   4. Webhook 2 (Admissions Applications):
--      - Name: alert_new_admission_application
--      - Table: admission_applications
--      - Events: Insert (check only 'Insert')
--      - Type: Supabase Edge Functions
--      - Edge Function: notify-school
--      - HTTP Method: POST
--      - Click "Create webhook"
-- ============================================================================

-- If you are using Supabase pg_net extension to trigger Edge Functions directly via SQL:
create extension if not exists pg_net with schema extensions;

-- (Optional) Helper SQL trigger example if configuring via SQL rather than dashboard UI:
-- Note: Replace YOUR_PROJECT_REF and YOUR_ANON_OR_SERVICE_KEY with your project credentials.
/*
create or replace function public.notify_school_on_insert()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-school',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)
    )
  );
  return NEW;
end;
$$;
*/

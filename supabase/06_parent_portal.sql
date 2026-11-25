-- ============================================================================
-- 06_parent_portal.sql: Parent Role & Application Tracking RLS Policies
--
-- PURPOSE:
-- 1. Expands user roles to include 'parent'
-- 2. Adds RLS policy permitting authenticated parents to view ONLY their own
--    child's admission applications based on their verified auth email
-- 3. Implements helper function public.is_parent()
-- ============================================================================

-- Step 1: Update the role check constraint on public.profiles
-- Allows 'parent' alongside 'admin', 'staff', and 'user'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check 
  check (role in ('admin', 'staff', 'user', 'parent'));

-- Step 2: Helper function to verify if the current user is a parent
create or replace function public.is_parent()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'parent'
  );
$$;

-- Step 3: Add RLS policy for Parents on admission_applications
-- Drop existing policy if present to allow idempotent re-runs
drop policy if exists "Parents can view their own application" on public.admission_applications;

create policy "Parents can view their own application"
  on public.admission_applications
  for select
  to authenticated
  using (
    -- Matches parent's registered auth email against the parent_email recorded on the application
    parent_email = (select auth.jwt()->>'email')
    or public.is_admin()
  );

-- Step 4: Verification test query (Run as logged-in parent or in SQL Editor)
-- select * from public.admission_applications;
-- Expected: Authenticated parents will see ONLY rows where parent_email = their email.

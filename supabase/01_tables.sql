-- ============================================================================
-- 01_tables.sql: Database Schema for St. Augustine International Academy
-- Creates tables: profiles, news, events, gallery_items, contact_messages, admission_applications
-- Includes: handle_new_user trigger and is_admin() helper function
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (linked to Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. NEWS TABLE
create table if not exists public.news (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  summary text not null,
  body text not null,
  cover_image_url text,
  is_published boolean default false not null,
  published_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. EVENTS TABLE
create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  event_date date not null,
  time text not null,
  location text not null,
  is_published boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. GALLERY ITEMS TABLE
create table if not exists public.gallery_items (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  caption text,
  album text default 'Campus Life',
  is_published boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. CONTACT MESSAGES TABLE (Insert-only for anonymous visitors)
create table if not exists public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. ADMISSION APPLICATIONS TABLE (Insert-only for anonymous visitors)
create table if not exists public.admission_applications (
  id uuid default uuid_generate_v4() primary key,
  child_name text not null,
  date_of_birth date not null,
  class_applying_for text not null,
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  address text not null,
  previous_school text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'accepted', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- Function: Check if current authenticated user has 'admin' role
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Function & Trigger: Automatically create public.profiles row when user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'staff' -- Defaults to staff; can be promoted to admin by database administrator
  );
  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 02_rls.sql: Row Level Security (RLS) Policies
-- Enforces:
-- 1. Public (anon) can read ONLY published news, events, and gallery items
-- 2. Public (anon) can INSERT into contact_messages and admission_applications (write-only)
-- 3. Public CANNOT read messages or applications
-- 4. Admins have full access to manage content and review submissions
-- ============================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.news enable row level security;
alter table public.events enable row level security;
alter table public.gallery_items enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admission_applications enable row level security;

-- ----------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- ----------------------------------------------------------------------------
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. NEWS POLICIES
-- ----------------------------------------------------------------------------
create policy "Public can read published news"
  on public.news for select
  using (is_published = true);

create policy "Admins can manage all news"
  on public.news for all
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. EVENTS POLICIES
-- ----------------------------------------------------------------------------
create policy "Public can read published events"
  on public.events for select
  using (is_published = true);

create policy "Admins can manage all events"
  on public.events for all
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. GALLERY ITEMS POLICIES
-- ----------------------------------------------------------------------------
create policy "Public can read published gallery items"
  on public.gallery_items for select
  using (is_published = true);

create policy "Admins can manage all gallery items"
  on public.gallery_items for all
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. CONTACT MESSAGES POLICIES (Insert-Only for public)
-- ----------------------------------------------------------------------------
create policy "Public can submit contact messages"
  on public.contact_messages for insert
  with check (true);

create policy "Admins can view and manage contact messages"
  on public.contact_messages for all
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. ADMISSION APPLICATIONS POLICIES (Insert-Only for public)
-- ----------------------------------------------------------------------------
create policy "Public can submit admission applications"
  on public.admission_applications for insert
  with check (true);

create policy "Admins can view and manage admission applications"
  on public.admission_applications for all
  using (public.is_admin());

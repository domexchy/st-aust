# backend-spec.md: School Website Backend (Supabase)

## 1. Purpose
The Supabase backend for a school website. It stores news, events, gallery photos, contact messages and admission applications, and lets school staff (admins) manage all of it securely.

The front end lives in `frontend-spec.md`. This file covers ONLY the backend: database, auth, security, storage.

## 2. Instructions to the AI agent
- I am learning Supabase. Explain each step in 2-4 plain sentences before doing it.
- Build in small phases from `backend-todo.md` and stop at each checkpoint.
- Give me exact dashboard click paths and ready-to-run SQL. Keep all SQL in a `/supabase` folder as numbered files (`01_tables.sql`, `02_rls.sql`, ...).
- Never use the `service_role` key in any front-end code.
- RLS must be enabled on every table in the `public` schema.

## 3. Stack
- Supabase: Postgres, Auth (email + password), Storage, optional Realtime
- Front end talks to Supabase only through `supabase-js` v2 using the anon key

## 4. Roles
| Role | Who | Can do |
|---|---|---|
| Public (anon) | Any visitor | Read published content; submit contact form and admission application |
| Admin | School staff | Full manage: news, events, gallery; read/update messages and applications |

Everyone who signs up gets a `profiles` row with role `user`. An admin is made by changing that role to `admin` manually in the dashboard (no public "become admin" route).

## 5. Database schema

```sql
-- PROFILES (one row per auth user)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile when a user signs up
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user an admin?
create function public.is_admin()
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- NEWS
create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  summary text,
  body text not null,
  cover_image_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

-- EVENTS
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- GALLERY
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  caption text,
  image_url text not null,
  album text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- CONTACT MESSAGES
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 5 and 200),
  phone text,
  message text not null check (char_length(message) between 5 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ADMISSION APPLICATIONS
create table public.admission_applications (
  id uuid primary key default gen_random_uuid(),
  child_full_name text not null,
  date_of_birth date not null,
  class_applying_for text not null,
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  address text,
  previous_school text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending','reviewing','accepted','rejected')),
  created_at timestamptz not null default now()
);
```

## 6. Row Level Security (RLS)

Enable RLS on every table:
```sql
alter table public.profiles enable row level security;
alter table public.news enable row level security;
alter table public.events enable row level security;
alter table public.gallery_items enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admission_applications enable row level security;
```

Policy rules (agent writes the SQL and explains each one):

| Table | Public / anon | Admin |
|---|---|---|
| profiles | A logged-in user can read their own row. Users CANNOT update their own `role`. | Read all |
| news | SELECT only where `published = true` | Full CRUD |
| events | SELECT only where `published = true` | Full CRUD |
| gallery_items | SELECT only where `published = true` | Full CRUD |
| contact_messages | INSERT only. No SELECT, UPDATE or DELETE. | SELECT, UPDATE (mark read), DELETE |
| admission_applications | INSERT only. No SELECT, UPDATE or DELETE. | SELECT, UPDATE (change status), DELETE |

Admin checks use `public.is_admin()`.

Important detail: a visitor who submits a form must NOT be able to read it back or read anyone else's. Insert-only for anon is deliberate.

## 7. Storage
| Bucket | Public? | Purpose | Who can upload |
|---|---|---|---|
| `school-media` | Public read | Gallery photos, news cover images | Admin only |

- Add storage policies on `storage.objects`: anyone can read from `school-media`, only admins can insert, update or delete.
- Limit uploads to images, max 5 MB each (enforced in the bucket settings and checked in the front end).

## 8. Auth settings
- Email + password enabled
- Public signup: the school site does not need public signup. Admins are created in the dashboard (Authentication > Users > Add user), or signup is disabled once the first admin exists.
- Set Site URL and Redirect URLs to the deployed domain before launch
- Turn email confirmation ON for production

## 9. Spam and abuse protection
- Length checks on contact and application fields (see schema)
- Stretch: add a simple honeypot field or CAPTCHA (e.g. Cloudflare Turnstile) on public forms
- Stretch: Edge Function to email the school when a new application or message arrives

## 10. API surface the front end will use
| Need | Call |
|---|---|
| List published news | `from('news').select().eq('published', true).order('published_at', {ascending:false})` |
| Single news post | `from('news').select().eq('slug', slug).single()` |
| Upcoming events | `from('events').select().gte('starts_at', now).order('starts_at')` |
| Gallery | `from('gallery_items').select().order('created_at', {ascending:false})` |
| Submit contact form | `from('contact_messages').insert({...})` |
| Submit application | `from('admission_applications').insert({...})` |
| Admin login | `auth.signInWithPassword()` |
| Admin upload | `storage.from('school-media').upload()` |
| Admin CRUD | `insert / update / delete` on each table |

## 11. Security rules (non-negotiable)
- Only the anon key in the browser. Never `service_role`.
- RLS on every table, tested with a non-admin user.
- Applications contain children's personal data: keep them private and only readable by admins.
- Keep SQL files in git. Never commit secrets.

## 12. Acceptance criteria
- [ ] Anon visitor can read published news/events/gallery and NOTHING unpublished
- [ ] Anon visitor can submit contact and application forms but cannot read any submissions
- [ ] A normal logged-in user cannot access admin data or promote themselves to admin
- [ ] Admin can create, edit, publish, unpublish and delete news, events and gallery items
- [ ] Admin can view messages and applications and change application status
- [ ] Only admins can upload to storage; anyone can view uploaded images
- [ ] No secret keys in the repo

# backend-todo.md: School Website Backend (Supabase)

Read `backend-spec.md` first. Work top to bottom and stop at every **CHECKPOINT**.

## Phase 0: Project setup
- [ ] Create a Supabase project (note region and DB password)
- [ ] Copy Project URL and anon key (Project Settings > API)
- [ ] Create `/supabase` folder in the repo for SQL files
- [ ] **CHECKPOINT:** I can find my URL and anon key and explain which one is safe in the browser

## Phase 1: Tables
- [ ] `01_tables.sql`: profiles, news, events, gallery_items, contact_messages, admission_applications
- [ ] Add `handle_new_user` trigger and `is_admin()` function
- [ ] Run in SQL Editor
- [ ] Verify all tables in Table Editor
- [ ] **CHECKPOINT:** I can explain what each table is for and what a trigger does

## Phase 2: Row Level Security
- [ ] Enable RLS on all tables (`02_rls.sql`)
- [ ] Write policies per the table in spec section 6
- [ ] Add sample rows (some published, some not) via `03_seed.sql`
- [ ] Test in SQL Editor or from the browser as anon: only published rows appear
- [ ] Test inserting a contact message as anon: works
- [ ] Test reading contact messages as anon: returns nothing
- [ ] **CHECKPOINT:** I can explain why anon is insert-only on forms

## Phase 3: Auth and admin
- [ ] Enable email + password; turn off confirm-email while developing
- [ ] Create my admin account (Authentication > Users > Add user)
- [ ] Set my profile `role` to `admin` (Table Editor or SQL)
- [ ] Test: `is_admin()` returns true for me, false for another test user
- [ ] Test: a normal user cannot change their own role
- [ ] **CHECKPOINT:** admin vs non-admin behaves differently on every table

## Phase 4: Storage
- [ ] Create public bucket `school-media`
- [ ] Add storage policies: public read, admin-only write/delete
- [ ] Set file size limit (5 MB) and allowed types (images)
- [ ] Test upload as admin: works. As normal user: blocked
- [ ] Test the public URL opens in a browser
- [ ] **CHECKPOINT:** image upload and public viewing work

## Phase 5: Integration with the front end
- [ ] Share the Project URL + anon key with the front end `config.js`
- [ ] Confirm every query in spec section 10 works from the browser
- [ ] Check error messages are friendly when RLS blocks something
- [ ] **CHECKPOINT:** front end can read, submit and (as admin) manage content

## Phase 6: Hardening and launch
- [ ] Re-test all RLS policies with: anon, normal user, admin
- [ ] Add length and format checks if any are missing
- [ ] Disable public signup (or confirm it is not exposed)
- [ ] Set Site URL and Redirect URLs to the live domain
- [ ] Turn email confirmation back ON
- [ ] Confirm no `service_role` key anywhere in the repo
- [ ] Check Supabase Advisors (security) for warnings and fix them
- [ ] **CHECKPOINT:** all acceptance criteria in spec section 12 pass

## Stretch
- [ ] Honeypot or Turnstile on public forms
- [ ] Edge Function that emails the school on new application/message
- [ ] Separate `parent` role with a portal to see their child's application status
- [ ] Database backups plan

## Learning log
- RLS in my own words:
- Why insert-only for anon:
- Something that broke and how I fixed it:

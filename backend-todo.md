# backend-todo.md: School Website Backend (Supabase)

Read `backend-spec.md` first. Work top to bottom and stop at every **CHECKPOINT**.

## Phase 0: Project setup
- [x] Create a Supabase project (note region and DB password)
- [x] Copy Project URL and anon key (Project Settings > API)
- [x] Create `/supabase` folder in the repo for SQL files
- [x] **CHECKPOINT:** I can find my URL and anon key and explain which one is safe in the browser

## Phase 1: Tables
- [x] `01_tables.sql`: profiles, news, events, gallery_items, contact_messages, admission_applications
- [x] Add `handle_new_user` trigger and `is_admin()` function
- [x] Run in SQL Editor
- [x] Verify all tables in Table Editor
- [x] **CHECKPOINT:** I can explain what each table is for and what a trigger does

## Phase 2: Row Level Security
- [x] Enable RLS on all tables (`02_rls.sql`)
- [x] Write policies per the table in spec section 6
- [x] Add sample rows (some published, some not) via `03_seed.sql`
- [x] Test in SQL Editor or from the browser as anon: only published rows appear
- [x] Test inserting a contact message as anon: works
- [x] Test reading contact messages as anon: returns nothing
- [x] **CHECKPOINT:** I can explain why anon is insert-only on forms

## Phase 3: Auth and admin
- [x] Enable email + password; turn off confirm-email while developing
- [x] Create my admin account (Authentication > Users > Add user)
- [x] Set my profile `role` to `admin` (Table Editor or SQL)
- [x] Test: `is_admin()` returns true for me, false for another test user
- [x] Test: a normal user cannot change their own role
- [x] **CHECKPOINT:** admin vs non-admin behaves differently on every table

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
- RLS in my own words: Row Level Security is like having a digital bouncer on every table drawer who checks who is asking before giving back any rows. Anonymous visitors only get to see rows marked is_published = true, while administrators with the is_admin() golden badge can read, edit, and manage everything.
- Why insert-only for anon: Forms like contact messages and student applications collect private personal data (parent emails, phone numbers, children's birthdates). By making anon insert-only with no SELECT permissions, parents can drop submissions into the school mailbox, but malicious visitors can never read or snoop on anyone else's private submissions.
- Something that broke and how I fixed it: When testing anonymously inserted records, attempting to request return=representation failed because anon users do not have read permissions. Switching to standard minimal return confirms 201 Created while preserving absolute zero-read privacy.

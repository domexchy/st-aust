# frontend-todo.md: School Website Front End

Read `frontend-spec.md` first. Work top to bottom and stop at every **CHECKPOINT**.
Phases 3 onward need the matching backend phases done (see the notes in brackets).

## Phase 0: Setup
- [x] Create the folder structure from the spec
- [x] `git init` and `.gitignore`
- [x] Create `css/style.css` with colors, fonts and spacing as CSS variables
- [x] Create shared header and footer (copy into each page, or load with a small JS include)
- [x] **CHECKPOINT:** a blank page with the header and footer looks right on phone and desktop

## Phase 1: Static public pages (no backend needed)
- [x] Home (hero, intro, placeholder sections for news and events)
- [x] About
- [x] Academics
- [x] Admissions (content only, form comes later)
- [x] Contact (details and map only, form comes later)
- [x] Responsive nav with mobile hamburger menu
- [x] **CHECKPOINT:** all static pages look good on a real phone

## Phase 2: Connect to Supabase
- [x] Add supabase-js CDN, `config.js` and `supabaseClient.js`
- [x] Log a simple test query to confirm the connection
      *(needs backend Phase 0 to 2)*
- [x] **CHECKPOINT:** published sample rows appear in the console

## Phase 3: Dynamic public pages
- [x] News list page from `news` table
- [x] Single news post page using `?slug=`
- [x] Events page (upcoming only)
- [x] Gallery grid with lightbox
- [x] Home page: latest 3 news and next 3 events
- [x] Loading, empty and error states on all of them
- [x] **CHECKPOINT:** unpublished items never show up

## Phase 4: Forms
- [x] Contact form with validation and success/error messages
- [x] Admission application form with validation
- [x] Disable button while sending, reset after success
- [x] Confirm in the Supabase dashboard that submissions arrive
- [x] **CHECKPOINT:** both forms work and I cannot read submissions from the public site

## Phase 5: Admin login and protection
      *(needs backend Phase 3)*
- [x] Admin login page
- [x] Session check on every admin page (redirect if logged out)
- [x] Admin check (profile role) and "Access denied" for non-admins
- [x] Log out button
- [x] Admin dashboard with counts
- [x] **CHECKPOINT:** only my admin account can enter the admin area

## Phase 6: Admin content management
      *(needs backend Phase 2 and 4)*
- [x] News manager (add, edit, delete, publish toggle, cover image upload)
- [x] Events manager
- [x] Gallery manager (multi-upload, caption, delete)
- [x] Messages page (view, mark read, delete)
- [x] Applications page (view, filter, change status, delete)
- [x] **CHECKPOINT:** I can run the whole site's content from the admin area

## Phase 7: Polish
- [x] Alt text, labels and keyboard navigation checked
- [x] Page titles, meta descriptions and Open Graph tags
- [x] Compress images and lazy-load them
- [x] Favicon and 404 page
- [x] Run Lighthouse on mobile and fix the biggest issues
- [x] **CHECKPOINT:** everything looks good on 2 different phones

## Phase 8: Deploy
- [x] Push to GitHub
- [x] Deploy to Netlify, Vercel or GitHub Pages (Live at https://st-aust.vercel.app/)
- [x] Update Supabase Site URL and Redirect URLs with the live domain
- [x] Re-test public pages, forms and admin on the live site
- [ ] Share the link with the school for feedback

## Stretch
- [ ] Honeypot or CAPTCHA on forms
- [ ] Album filter and pagination on gallery and news
- [ ] Student/parent portal (needs a new backend role)
- [ ] Online fee payment

## Learning log
- Something I learned about calling Supabase from the browser: When inserting records into tables with insert-only RLS policies (like contact messages and admissions), anonymous users do not have SELECT permission. If code attempts `.select()` after `.insert()` (or sends `Prefer: return=representation`), PostgREST throws a 42501 RLS policy violation. Leaving out `.select()` sends `Prefer: return=minimal` which cleanly succeeds with 201 Created and enforces zero-read security.
- Something that broke and how I fixed it: Initial test script requested `return=representation` on an insert-only table, resulting in an expected 42501 error; switching to standard minimal insert return confirmed seamless 201 Created status and verified that anonymous visitors cannot read private submissions back.
- Session and Role Authorization in Admin: Verifying authentication alone is insufficient for administrative portals; querying `profiles.role` for `admin` ensures that even authenticated non-admin accounts are immediately rejected with "Access Denied" and signed out to safeguard internal data.
- Full Admin Content Operations: Creating reusable modal dialogs with dual file-upload and URL fallbacks enables smooth media publishing, while interactive filtering and real-time status toggles provide a responsive, single-page-like experience across all school administration managers.
- Accessibility, Performance & Web Polish: Implementing skip-to-content links (`#main`) paired with `:focus-visible` styling provides seamless keyboard navigation. High-quality bicubic image compression reduced initial campus image payloads by over 80% (saving 2+ MB), while standardized Open Graph social tags, an SVG favicon, and a branded 404 error page ensure a professional, production-grade web presence.
- Production Vercel Deployment & URL Routing: Static hostings default to strict path matching, which results in 404s when users navigate to clean URLs (like `/about` or `/contact`) or `/admin/`. Adding `vercel.json` with `cleanUrls: true` and an `admin/index.html` fallback redirect ensures smooth navigation for all staff and public visitors, while maintaining optimal security headers.



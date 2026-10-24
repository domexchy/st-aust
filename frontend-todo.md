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
- [ ] News list page from `news` table
- [ ] Single news post page using `?slug=`
- [ ] Events page (upcoming only)
- [ ] Gallery grid with lightbox
- [ ] Home page: latest 3 news and next 3 events
- [ ] Loading, empty and error states on all of them
- [ ] **CHECKPOINT:** unpublished items never show up

## Phase 4: Forms
- [ ] Contact form with validation and success/error messages
- [ ] Admission application form with validation
- [ ] Disable button while sending, reset after success
- [ ] Confirm in the Supabase dashboard that submissions arrive
- [ ] **CHECKPOINT:** both forms work and I cannot read submissions from the public site

## Phase 5: Admin login and protection
      *(needs backend Phase 3)*
- [ ] Admin login page
- [ ] Session check on every admin page (redirect if logged out)
- [ ] Admin check (profile role) and "Access denied" for non-admins
- [ ] Log out button
- [ ] Admin dashboard with counts
- [ ] **CHECKPOINT:** only my admin account can enter the admin area

## Phase 6: Admin content management
      *(needs backend Phase 2 and 4)*
- [ ] News manager (add, edit, delete, publish toggle, cover image upload)
- [ ] Events manager
- [ ] Gallery manager (multi-upload, caption, delete)
- [ ] Messages page (view, mark read, delete)
- [ ] Applications page (view, filter, change status, delete)
- [ ] **CHECKPOINT:** I can run the whole site's content from the admin area

## Phase 7: Polish
- [ ] Alt text, labels and keyboard navigation checked
- [ ] Page titles, meta descriptions and Open Graph tags
- [ ] Compress images and lazy-load them
- [ ] Favicon and 404 page
- [ ] Run Lighthouse on mobile and fix the biggest issues
- [ ] **CHECKPOINT:** everything looks good on 2 different phones

## Phase 8: Deploy
- [ ] Push to GitHub
- [ ] Deploy to Netlify, Vercel or GitHub Pages
- [ ] Update Supabase Site URL and Redirect URLs with the live domain
- [ ] Re-test public pages, forms and admin on the live site
- [ ] Share the link with the school for feedback

## Stretch
- [ ] Honeypot or CAPTCHA on forms
- [ ] Album filter and pagination on gallery and news
- [ ] Student/parent portal (needs a new backend role)
- [ ] Online fee payment

## Learning log
- Something I learned about calling Supabase from the browser: Vanilla browser setups require the public anon key and CDN imports, and static pages must remain lightweight with mobile-first CSS and semantic HTML.
- Something that broke and how I fixed it: Git initially required user identity in this new workspace; configured repository-level git user.name and user.email to ensure clean commits.

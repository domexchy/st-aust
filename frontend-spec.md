# frontend-spec.md: School Website Front End

## 1. Purpose
A clean, fast, mobile-friendly website for a school that lets parents learn about the school, read news, see events and photos, contact the school and apply for admission. School staff get a private admin area to manage content.

The Supabase backend is described separately in `backend-spec.md`. This file covers ONLY the front end: pages, UI, behavior.

## 2. Instructions to the AI agent
- I am a beginner. Explain each step briefly before building it.
- Build page by page following `frontend-todo.md`, and stop at each checkpoint.
- Keep it simple: plain HTML, CSS and JavaScript. No frameworks or build tools.
- Comment every place where the code talks to Supabase.
- Mobile first. Most visitors will be on phones with slow data, so keep pages light.

## 3. Stack
- HTML, CSS, vanilla JavaScript (ES modules)
- `supabase-js` v2 from CDN
- `config.js` holds `SUPABASE_URL` and `SUPABASE_ANON_KEY` (anon key only)
- Hosting: Netlify, Vercel or GitHub Pages

## 4. Folder structure
```
school-site/
├── index.html
├── about.html
├── academics.html
├── admissions.html
├── news.html
├── news-post.html        # single post, loaded by ?slug=
├── events.html
├── gallery.html
├── contact.html
├── admin/
│   ├── login.html
│   ├── dashboard.html
│   ├── news.html
│   ├── events.html
│   ├── gallery.html
│   ├── messages.html
│   └── applications.html
├── css/style.css
├── js/
│   ├── config.js
│   ├── supabaseClient.js
│   ├── public.js
│   └── admin.js
├── images/
├── backend-spec.md  frontend-spec.md  backend-todo.md  frontend-todo.md
```

## 5. Public pages

| Page | Content |
|---|---|
| Home | Hero with school name, motto and "Apply now" button; short intro; latest 3 news; next 3 events; quick links |
| About | History, mission/vision, core values, leadership message |
| Academics | Sections: Nursery, Primary, Secondary; subjects; extra-curricular activities |
| Admissions | Process steps, requirements, fees note, and the **application form** |
| News | List of published posts (cards with cover image, title, date, summary); click opens the post |
| News post | Full article by slug |
| Events | Upcoming events, sorted by date, with date, time and location |
| Gallery | Photo grid, optional album filter, click to enlarge |
| Contact | Address, phone, email, map embed, and the **contact form** |

Shared on every page: header with logo and nav (hamburger menu on mobile), footer with contact info and social links.

## 6. Forms

**Contact form:** name, email, phone (optional), message. 
**Admission form:** child's full name, date of birth, class applying for, parent name, parent email, parent phone, address, previous school, notes.

Both forms must:
- Validate in the browser (required fields, email format, phone format) before sending
- Disable the submit button while sending
- Show a clear success message ("Thank you, we will contact you") or a friendly error
- Clear the form after success
- NOT try to read submissions back (the backend does not allow it)

## 7. Admin area (private)
- `/admin/login.html`: email and password, then redirect to dashboard
- Every admin page checks the session on load; if not logged in, redirect to login
- If the user is logged in but not an admin, show "Access denied" and log out
- **Dashboard:** counts of unread messages and pending applications; quick links
- **News manager:** table of posts; add/edit form (title, slug, summary, body, cover image upload, published toggle); delete with confirm
- **Events manager:** table; add/edit/delete; published toggle
- **Gallery manager:** upload images with caption and album; delete; published toggle
- **Messages:** list, open a message, mark as read, delete
- **Applications:** list with filter by status; open details; change status (pending, reviewing, accepted, rejected); delete
- Log out button on every admin page

## 8. Design guidelines
- Pick a simple school palette: 1 main color, 1 accent, white/light grey background (example: deep blue + gold)
- One readable font pair (e.g. Poppins for headings, Inter or system font for text)
- Large readable text, good contrast, big tap targets
- Cards with soft shadows and rounded corners; consistent spacing
- Real school photos where possible; compress images and use `loading="lazy"`
- Show loading states ("Loading news...") and empty states ("No events yet")

## 9. Behavior and quality
- Responsive: phone, tablet, desktop
- Works on slow connections: small images, minimal JS
- Basic accessibility: alt text on images, labels on inputs, keyboard-friendly nav
- Basic SEO: unique `<title>` and meta description per page, Open Graph tags for news posts
- Escape or safely render user/admin-entered text (never inject raw HTML from the database without care)
- Friendly error messages if Supabase is unreachable

## 10. Supabase calls the front end uses
See `backend-spec.md` section 10. Use only the anon key. Never include or request a `service_role` key.

## 11. Acceptance criteria
- [ ] All public pages exist, look good on a phone and share the same header/footer
- [ ] News, events and gallery show real data from Supabase
- [ ] Contact and admission forms validate, submit and show success/error states
- [ ] Admin pages are unreachable without login, and blocked for non-admins
- [ ] Admin can fully manage news, events and gallery, and process messages and applications
- [ ] Lighthouse mobile score around 80+ for performance and accessibility
- [ ] Deployed on a live URL and tested on a real phone

## 12. Out of scope (for now)
Online fee payment, student/parent portal, results checking, blogs with comments, multiple languages.

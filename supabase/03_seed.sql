-- ============================================================================
-- 03_seed.sql: Sample Seed Data
-- Adds sample rows (published and unpublished) to verify RLS filtering
-- Anonymous clients should ONLY see rows with is_published = true
-- ============================================================================

-- 1. SEED NEWS (2 published, 1 unpublished draft)
insert into public.news (title, slug, summary, body, cover_image_url, is_published, published_at)
values
(
  'St. Augustine Students Triumph at National STEM Olympiad',
  'national-stem-olympiad-triumph-2026',
  'Our Junior Secondary robotics team secured first place with their solar-powered autonomous agriculture drone innovation.',
  'We are thrilled to announce that our Junior Secondary robotics innovators took home the gold trophy at the National STEM Olympiad held in Abuja. The team engineered a working prototype of an autonomous solar-powered drone tailored for precision agriculture.',
  'images/classroom-academics.jpg',
  true,
  now() - interval '5 days'
),
(
  'Annual Inter-House Sports Gala Announced for November',
  'annual-inter-house-sports-gala-2026',
  'Preparations are underway for the 2026 Athletics tournament featuring track, swimming, basketball, and gymnastics.',
  'The St. Augustine Academy community looks forward to our premier sporting event of the term. House Blue, Green, Gold, and Red will compete across athletics, relays, tennis, and aquatic swimming competitions.',
  'images/hero-campus.jpg',
  true,
  now() - interval '2 days'
),
(
  '[DRAFT] Internal Staff Professional Development Workshop Schedule',
  'draft-internal-staff-workshop-schedule',
  'Draft schedule for teacher training sessions on Cambridge Checkpoint updates.',
  'Confidential internal staff notes. This post is unpublished and must NEVER be visible to anonymous public visitors.',
  null,
  false,
  null
);

-- 2. SEED EVENTS (2 published, 1 unpublished draft)
insert into public.events (title, description, event_date, time, location, is_published)
values
(
  'Annual Open House & Campus Discovery Tour',
  'Prospective parents and children are invited to tour science labs, art studios, and meet teachers.',
  '2026-11-14',
  '9:00 AM - 1:00 PM',
  'Main Auditorium & Campus Grounds',
  true
),
(
  'First Term Parent-Teacher Academic Conference',
  'Interactive session for parents and subject tutors to review mid-term academic progress.',
  '2026-11-26',
  '2:00 PM - 5:00 PM',
  'Classroom Wings & Assembly Hall',
  true
),
(
  '[UNPUBLISHED] Board of Governors Closed Executive Strategy Meeting',
  'Confidential strategic planning meeting for academy leadership.',
  '2026-12-05',
  '10:00 AM - 2:00 PM',
  'Boardroom 4',
  false
);

-- 3. SEED GALLERY ITEMS (3 published)
insert into public.gallery_items (image_url, caption, album, is_published)
values
(
  'images/hero-campus.jpg',
  'Students walking across our landscaped main quadrangle',
  'Campus Life',
  true
),
(
  'images/classroom-academics.jpg',
  'Collaborative robotics and coding project experimentation in the STEM Lab',
  'Academics',
  true
),
(
  'images/principal-portrait.jpg',
  'Principal Dr. Evelyn Adeleke in the Academy Library Innovation Center',
  'Leadership',
  true
);

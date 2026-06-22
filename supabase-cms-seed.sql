-- ============================================================
-- GSAW CMS Seed Data
-- Run AFTER supabase-cms-setup.sql
-- This populates all CMS tables with existing website content
-- so everything is visible and editable from the Admin Portal.
-- ============================================================

-- Add link_url to site_news (for linking to existing article pages)
ALTER TABLE site_news ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE site_news ADD COLUMN IF NOT EXISTS link_text TEXT;

-- NOTE: image_path is left NULL for these seeded records because the
-- images are served from GitHub Pages, not Supabase Storage.
-- Only records with Supabase Storage images need image_path set.

-- Allow NULL image_path (GitHub Pages images don't have a Supabase Storage path)
ALTER TABLE gallery_photos ALTER COLUMN image_path DROP NOT NULL;
ALTER TABLE site_events ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE site_events ALTER COLUMN image_path DROP NOT NULL;

-- ============================================================
-- 1. SITE LEADERS (all current NEC members)
-- ============================================================
INSERT INTO site_leaders (name, title, bio, is_primary, photo_url, photo_path, display_order, is_active) VALUES
(
  'Ms Nokuxola Florence Mnyateli',
  'President',
  'Head and chief directing officer of GSAW. Presents comprehensive statements on the state of the nation and outlines party policy. Makes pronouncements on behalf of the NEC.',
  true,
  'https://visiondevs.github.io/godsaveafrica/images/leader-president.jpg',
  NULL,
  1,
  true
),
(
  'Mr Mpumelelo Jason Booi',
  'Deputy President',
  'Assists and deputises for the President. Carries out functions entrusted by Convention, President, or NEC.',
  false,
  NULL,
  NULL,
  2,
  true
),
(
  'Mr Siyabulela Mathenga',
  'Chairperson',
  'Presides over National Convention. Custodian of decisions. Operates within parameters of policy set out by Convention.',
  false,
  'https://visiondevs.github.io/godsaveafrica/images/leader-chairperson.jpg',
  NULL,
  3,
  true
),
(
  'Ms Christina Nomthandazo Khundla',
  'Deputy Chairperson',
  'Assists and deputises for the Chairperson. Ensures governance procedures are followed at all levels.',
  false,
  'https://visiondevs.github.io/godsaveafrica/images/leader-deputy-chair.jpg',
  NULL,
  4,
  true
),
(
  'Ms Siphokazi Rozani',
  'Secretary General',
  'Chief administrative officer. Keeps minutes, conducts correspondence, conveys decisions and instructions to provincial structures. Full-time functionary.',
  false,
  'https://visiondevs.github.io/godsaveafrica/images/leader-secretary.jpg',
  NULL,
  5,
  true
),
(
  'Mr Sindisile Welcome Matinise',
  'Treasurer General',
  'Chief custodian of funds and property. Manages banking, financial reporting, budgets, and fund raising activities.',
  false,
  'https://visiondevs.github.io/godsaveafrica/images/leader-treasurer.jpg',
  NULL,
  6,
  true
),
(
  'Mr Vincent Ndzala',
  'Deputy Secretary General',
  'Assists and deputises for the Secretary General. Carries out functions entrusted by Convention or NEC.',
  false,
  NULL,
  NULL,
  7,
  true
),
(
  'Mr Lutendo Ramalana',
  'Spokesperson',
  NULL,
  false,
  'https://visiondevs.github.io/godsaveafrica/images/leader-spokesperson.jpg',
  NULL,
  8,
  true
),
(
  'To Be Appointed',
  'Head of Provinces',
  NULL,
  false,
  NULL,
  NULL,
  9,
  true
),
(
  'To Be Appointed',
  'Head of Departments',
  NULL,
  false,
  NULL,
  NULL,
  10,
  true
),
(
  'To Be Appointed',
  'Organiser',
  NULL,
  false,
  NULL,
  NULL,
  11,
  true
);

-- ============================================================
-- 2. SITE EVENTS (existing hardcoded events)
-- ============================================================
INSERT INTO site_events (title, event_type, description, event_date, event_time, location, image_url, image_path, link_url, link_text, is_archived) VALUES
(
  'GSAW Gospel Extravaganza',
  'gospel',
  'An unforgettable afternoon of worship and praise. Featuring: Nombongo Siyona, Pearl Tobi, Spokazi Ciyana, Apostle Nzi, Tumi, Enika Sompani, Thembelani Mbilini, Gcobani Mahayiya.' || E'\n\n' ||
  'Ticket Prices: Early Bird R140 | General R150 | VIP R200' || E'\n' ||
  'Contact MJ Makhaza: 073 213 1439',
  '2026-07-04',
  '13:00',
  'AFM Worship Centre',
  'https://visiondevs.github.io/godsaveafrica/images/gospel-extravaganza.jpg',
  NULL,
  'https://wa.me/27732131439?text=Hi%2C%20I%20want%20to%20book%20tickets%20for%20the%20GSAW%20Gospel%20Extravaganza%20on%204%20July',
  'Book Tickets via WhatsApp',
  false
),
(
  'National Voter Registration Weekend',
  'registration',
  'GSAW calls all eligible South Africans to register or check their registration at their nearest voting station. Your vote is your power. Bring your ID book or smart card.',
  '2026-06-20',
  '08:00 - 17:00',
  'All voting stations nationwide',
  NULL,
  NULL,
  'https://www.elections.org.za/pw/Voter/How-Do-I-Register-To-Vote',
  'IEC Registration Info',
  false
);

-- ============================================================
-- 3. SITE NEWS (existing hardcoded articles)
-- ============================================================
INSERT INTO site_news (title, summary, author, category, cover_image_url, cover_image_path, link_url, link_text, is_published, published_at) VALUES
(
  'Volunteer With GSAW — Be Part of the Movement!',
  'GSAW is calling for volunteers across all 9 provinces. Help with campaigns, events, voter registration, media, and community outreach. No membership required.',
  'GSAW NEC',
  'Volunteer',
  'https://visiondevs.github.io/godsaveafrica/images/volunteer-march-1.jpg',
  NULL,
  'news/volunteer-with-gsaw',
  'Read More & Sign Up',
  true,
  '2026-06-18 08:00:00+02'
),
(
  'GSAW Gospel Extravaganza',
  'An unforgettable afternoon of worship and praise at AFM Worship Centre. Featuring Nombongo Siyona, Pearl Tobi, Spokazi Ciyana, Apostle Nzi and more. Tickets from R140.',
  'GSAW NEC',
  'Gospel Event',
  'https://visiondevs.github.io/godsaveafrica/images/gospel-extravaganza.jpg',
  NULL,
  'news/gospel-extravaganza',
  'Read More & Book Tickets',
  true,
  '2026-07-04 08:00:00+02'
),
(
  'Register to Vote — 20-21 June 2026!',
  'GSAW calls on all South Africans aged 18+ to register at their nearest voting station this weekend. Your vote is your voice. Stand up for Godly governance.',
  'GSAW NEC',
  'Elections',
  NULL,
  NULL,
  'news/register-to-vote-2026',
  'Read Full Article',
  true,
  '2026-06-15 08:00:00+02'
),
(
  'GSAW Constitution Formally Adopted',
  'The GSAW Constitution has been formally adopted, establishing our governance framework, membership rules, leadership structure and party discipline procedures.',
  'GSAW NEC',
  'Party News',
  NULL,
  NULL,
  'news/constitution-adopted',
  'Read Full Article',
  true,
  '2026-06-01 08:00:00+02'
),
(
  'NEC Policy Framework Released',
  'The National Executive Committee policy outlining structure, roles, meeting protocols, dress code, and member responsibilities has been finalized and adopted.',
  'GSAW NEC',
  'Policy',
  NULL,
  NULL,
  'news/nec-policy-released',
  'Read Full Article',
  true,
  '2026-05-15 08:00:00+02'
);

-- ============================================================
-- 4. GALLERY PHOTOS (existing hardcoded images)
-- ============================================================
INSERT INTO gallery_photos (caption, album, image_url, image_path, display_order) VALUES
(
  'GSAW volunteers marching in Eastern Cape',
  'Volunteers',
  'https://visiondevs.github.io/godsaveafrica/images/volunteer-march-1.jpg',
  NULL,
  1
),
(
  'GSAW youth at Parliament of South Africa',
  'Volunteers',
  'https://visiondevs.github.io/godsaveafrica/images/volunteer-youth-1.jpg',
  NULL,
  2
),
(
  'GSAW supporters at Eastern Cape march',
  'Volunteers',
  'https://visiondevs.github.io/godsaveafrica/images/volunteer-march-2.jpg',
  NULL,
  3
),
(
  'Community outreach — food aid distribution',
  'Outreach',
  'https://visiondevs.github.io/godsaveafrica/images/slide-outreach-1.jpg',
  NULL,
  4
),
(
  'Church worship and prayer gathering',
  'Events',
  'https://visiondevs.github.io/godsaveafrica/images/slide-worship-1.jpg',
  NULL,
  5
),
(
  'Volunteers working with children in the community',
  'Outreach',
  'https://visiondevs.github.io/godsaveafrica/images/slide-community-1.jpg',
  NULL,
  6
),
(
  'Church choir singing with passion',
  'Events',
  'https://visiondevs.github.io/godsaveafrica/images/slide-choir-1.jpg',
  NULL,
  7
),
(
  'Man praying in devotion',
  'Events',
  'https://visiondevs.github.io/godsaveafrica/images/gallery-worship-1.jpg',
  NULL,
  8
);

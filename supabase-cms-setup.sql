-- ============================================================
-- GSAW CMS Tables Setup
-- Run in Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/nvgoaikzidtpyvmffmxq/sql/new
-- ============================================================

-- 1. SITE ANNOUNCEMENTS (banners with optional countdowns)
CREATE TABLE IF NOT EXISTS site_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    color TEXT DEFAULT 'green',
    link_url TEXT,
    link_text TEXT,
    show_countdown BOOLEAN DEFAULT FALSE,
    countdown_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS
CREATE TABLE IF NOT EXISTS site_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    event_type TEXT DEFAULT 'general',
    description TEXT,
    event_date DATE NOT NULL,
    event_time TEXT,
    location TEXT,
    image_url TEXT,
    image_path TEXT,
    link_url TEXT,
    link_text TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NEWS ARTICLES
CREATE TABLE IF NOT EXISTS site_news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    body TEXT,
    author TEXT DEFAULT 'GSAW NEC',
    category TEXT DEFAULT 'General',
    cover_image_url TEXT,
    cover_image_path TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GALLERY PHOTOS
CREATE TABLE IF NOT EXISTS gallery_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    caption TEXT,
    album TEXT DEFAULT 'General',
    image_url TEXT NOT NULL,
    image_path TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LEADERS (for dynamic leadership page)
CREATE TABLE IF NOT EXISTS site_leaders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    bio TEXT,
    photo_url TEXT,
    photo_path TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE site_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_leaders ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ POLICIES (website needs to read content)
CREATE POLICY "public read site_announcements" ON site_announcements FOR SELECT TO anon USING (true);
CREATE POLICY "public read site_events" ON site_events FOR SELECT TO anon USING (true);
CREATE POLICY "public read site_news" ON site_news FOR SELECT TO anon USING (true);
CREATE POLICY "public read gallery_photos" ON gallery_photos FOR SELECT TO anon USING (true);
CREATE POLICY "public read site_leaders" ON site_leaders FOR SELECT TO anon USING (true);

-- ANON CRUD POLICIES (admin portal uses anon key)
CREATE POLICY "anon crud site_announcements" ON site_announcements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon crud site_events" ON site_events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon crud site_news" ON site_news FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon crud gallery_photos" ON gallery_photos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon crud site_leaders" ON site_leaders FOR ALL TO anon USING (true) WITH CHECK (true);

-- STORAGE BUCKET (gsaw-media) + POLICIES
INSERT INTO storage.buckets (id, name, public) VALUES ('gsaw-media', 'gsaw-media', true) ON CONFLICT DO NOTHING;
CREATE POLICY "public read gsaw-media" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'gsaw-media');
CREATE POLICY "anon upload gsaw-media" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'gsaw-media');
CREATE POLICY "anon delete gsaw-media" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'gsaw-media');
CREATE POLICY "anon update gsaw-media" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'gsaw-media');

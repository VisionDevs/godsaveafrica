-- ========================================
-- GSAW Supabase Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard > SQL Editor)
-- ========================================

-- 1. MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    id_number TEXT UNIQUE,
    date_of_birth TEXT,
    gender TEXT,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    municipality TEXT,
    ward TEXT,
    voting_station TEXT,
    occupation TEXT,
    qualification TEXT,
    skills TEXT,
    reason TEXT,
    membership_number TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    signature_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DONATIONS TABLE
CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_name TEXT,
    donor_type TEXT DEFAULT 'individual',
    first_name TEXT,
    last_name TEXT,
    org_name TEXT,
    contact_person TEXT,
    amount DECIMAL(12,2),
    purpose TEXT DEFAULT 'General',
    email TEXT,
    phone TEXT,
    message TEXT,
    has_proof_of_payment BOOLEAN DEFAULT FALSE,
    proof_file_name TEXT,
    proof_file_type TEXT,
    proof_file_url TEXT,
    status TEXT DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES - Allow public to insert (for form submissions)
CREATE POLICY "Allow public insert on memberships" ON memberships
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public insert on donations" ON donations
    FOR INSERT TO anon WITH CHECK (true);

-- 5. POLICIES - Allow public to read (for admin panel)
CREATE POLICY "Allow public read on memberships" ON memberships
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public read on donations" ON donations
    FOR SELECT TO anon USING (true);

-- 6. POLICIES - Allow public to update (for approve/verify)
CREATE POLICY "Allow public update on memberships" ON memberships
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow public update on donations" ON donations
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 7. POLICIES - Allow public to delete (for admin remove)
CREATE POLICY "Allow public delete on memberships" ON memberships
    FOR DELETE TO anon USING (true);

CREATE POLICY "Allow public delete on donations" ON donations
    FOR DELETE TO anon USING (true);

-- 8. CREATE INDEXES for faster queries
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_email ON memberships(email);
CREATE INDEX idx_memberships_province ON memberships(province);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_email ON donations(email);

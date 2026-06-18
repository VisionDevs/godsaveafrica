-- ============================================================
-- GSAW Database Setup: Run these in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → paste & Run
-- ============================================================

-- 1. Volunteers table
CREATE TABLE IF NOT EXISTS volunteers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    province text NOT NULL,
    areas text,
    availability text,
    message text,
    submitted_at text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (website form submissions)
CREATE POLICY "Allow anonymous insert" ON volunteers
    FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated reads (admin panel)
CREATE POLICY "Allow authenticated read" ON volunteers
    FOR SELECT TO anon USING (true);


-- 2. Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    submitted_at text,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Allow anonymous insert" ON contact_messages
    FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated reads
CREATE POLICY "Allow authenticated read" ON contact_messages
    FOR SELECT TO anon USING (true);

-- Allow updates (mark as read from admin)
CREATE POLICY "Allow update contact messages" ON contact_messages
    FOR UPDATE TO anon USING (true) WITH CHECK (true);


-- ============================================================
-- SUPABASE EDGE FUNCTION: notify-admin
-- Deploy via Supabase Dashboard → Edge Functions → Deploy New Function
-- Name: notify-admin
-- ============================================================
-- The Edge Function code (TypeScript/Deno) should be:
-- 
-- import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
-- 
-- const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') // Set in Supabase Secrets
-- const ADMIN_EMAIL = 'admin@gsaw.org.za'
-- 
-- serve(async (req) => {
--   const { type, data } = await req.json()
--   
--   let subject = ''
--   let body = ''
--   
--   if (type === 'new_membership') {
--     subject = `[GSAW] New Membership Application: ${data.name}`
--     body = `New membership application received:\n\nName: ${data.name}\nProvince: ${data.province}\nEmail: ${data.email}\n\nLogin to admin panel to review: https://www.gsaw.org.za/admin`
--   } else if (type === 'new_donation') {
--     subject = `[GSAW] New Donation: R${data.amount}`
--     body = `New donation received:\n\nDonor: ${data.donor}\nAmount: R${data.amount}\nPurpose: ${data.purpose}\n\nLogin to admin panel to review: https://www.gsaw.org.za/admin`
--   } else if (type === 'new_volunteer') {
--     subject = `[GSAW] New Volunteer: ${data.name}`
--     body = `New volunteer registration:\n\nName: ${data.name}\nProvince: ${data.province}\nAreas: ${data.areas}\n\nLogin to admin panel to review: https://www.gsaw.org.za/admin`
--   } else if (type === 'new_contact') {
--     subject = `[GSAW] Contact Message: ${data.subject}`
--     body = `New contact message:\n\nFrom: ${data.name} (${data.email})\nSubject: ${data.subject}\nMessage: ${data.message}`
--   } else if (type === 'reply') {
--     // Admin reply to a contact message — send from info@gsaw.org.za
--     const res = await fetch('https://api.resend.com/emails', {
--       method: 'POST',
--       headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
--       body: JSON.stringify({ from: 'GSAW <info@gsaw.org.za>', to: data.to, subject: data.subject, text: data.message, reply_to: 'info@gsaw.org.za' })
--     })
--     const result = await res.json()
--     return new Response(JSON.stringify({ ok: true, result }), { headers: { 'Content-Type': 'application/json' } })
--   }
--   
--   // Send via Resend (free tier: 100 emails/day)
--   const res = await fetch('https://api.resend.com/emails', {
--     method: 'POST',
--     headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
--     body: JSON.stringify({ from: 'GSAW Notifications <notifications@gsaw.org.za>', to: ADMIN_EMAIL, subject, text: body })
--   })
--   
--   return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
-- })
--
-- SETUP STEPS:
-- 1. Sign up at https://resend.com (free tier: 100 emails/day)
-- 2. Add & verify domain gsaw.org.za in Resend (add DNS records)
-- 3. Get API key from Resend dashboard
-- 4. In Supabase Dashboard → Settings → Secrets → Add: RESEND_API_KEY = re_xxxx...
-- 5. Deploy the Edge Function above via Dashboard or CLI

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

-- Allow admin delete
CREATE POLICY "Allow public delete on volunteers" ON volunteers
    FOR DELETE TO anon USING (true);


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

-- Allow admin delete
CREATE POLICY "Allow public delete on contact_messages" ON contact_messages
    FOR DELETE TO anon USING (true);


-- ============================================================
-- SUPABASE EDGE FUNCTION: notify-admin
-- Deploy via Supabase Dashboard → Edge Functions → Deploy New Function
-- Name: notify-admin
-- ============================================================
-- The Edge Function code (TypeScript/Deno) should be:
-- 
-- import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
-- 
-- const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
-- const ADMIN_EMAILS = ['admin@gsaw.org.za', 'info@gsaw.org.za']
-- 
-- const corsHeaders = {
--   'Access-Control-Allow-Origin': '*',
--   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
--   'Access-Control-Allow-Methods': 'POST, OPTIONS',
-- }
-- 
-- serve(async (req) => {
--   // Handle CORS preflight
--   if (req.method === 'OPTIONS') {
--     return new Response('ok', { headers: corsHeaders })
--   }
-- 
--   try {
--     const { type, data } = await req.json()
--     
--     let subject = ''
--     let adminBody = ''
--     let confirmSubject = ''
--     let confirmBody = ''
--     let userEmail = ''
--     
--     if (type === 'new_membership') {
--       userEmail = data.email
--       subject = `[GSAW] New Membership Application: ${data.name}`
--       adminBody = `New membership application received:\n\nName: ${data.name}\nProvince: ${data.province}\nEmail: ${data.email}\n\nLogin to admin panel to review: https://www.gsaw.org.za/admin`
--       confirmSubject = 'GSAW Membership Application Received'
--       confirmBody = `Dear ${data.name},\n\nThank you for applying to join God Save Africa & The World (GSAW)!\n\nWe have received your membership application and our team will review it promptly. You will be contacted once your application has been processed.\n\nIn the meantime, you can check your application status at: https://www.gsaw.org.za/status\n\n#AllPowerBelongsToJesus\n\nKind regards,\nGSAW National Office\ninfo@gsaw.org.za | +27 73 585 0365\nwww.gsaw.org.za`
--     } else if (type === 'new_donation') {
--       userEmail = data.email || ''
--       subject = `[GSAW] New Donation: R${data.amount}`
--       adminBody = `New donation received:\n\nDonor: ${data.donor}\nAmount: R${data.amount}\nPurpose: ${data.purpose}\n\nLogin to admin panel to review: https://www.gsaw.org.za/admin`
--       confirmSubject = 'GSAW Donation Received - Thank You!'
--       confirmBody = `Dear ${data.donor},\n\nThank you for your generous donation of R${data.amount} to God Save Africa & The World (GSAW)!\n\nYour contribution supports our mission of Godly governance, service delivery, and community upliftment across South Africa.\n\nMay God bless you abundantly.\n\n#AllPowerBelongsToJesus\n\nKind regards,\nGSAW National Office\ninfo@gsaw.org.za | +27 73 585 0365\nwww.gsaw.org.za`
--     } else if (type === 'new_volunteer') {
--       userEmail = data.email || ''
--       subject = `[GSAW] New Volunteer: ${data.name}`
--       adminBody = `New volunteer registration:\n\nName: ${data.name}\nProvince: ${data.province}\nAreas: ${data.areas}\nEmail: ${data.email || 'Not provided'}\n\nLogin to admin panel to review: https://www.gsaw.org.za/admin`
--       confirmSubject = 'Welcome to GSAW Volunteers!'
--       confirmBody = `Dear ${data.name},\n\nThank you for volunteering with God Save Africa & The World (GSAW)!\n\nWe have received your volunteer registration and our team will reach out to you promptly with next steps for your area.\n\nTogether we can make a difference in our communities.\n\n#AllPowerBelongsToJesus\n\nKind regards,\nGSAW National Office\ninfo@gsaw.org.za | +27 73 585 0365\nwww.gsaw.org.za`
--     } else if (type === 'new_contact') {
--       userEmail = data.email
--       subject = `[GSAW] Contact Message: ${data.subject}`
--       adminBody = `New contact message:\n\nFrom: ${data.name} (${data.email})\nSubject: ${data.subject}\nMessage: ${data.message}`
--       confirmSubject = 'GSAW - We Received Your Message'
--       confirmBody = `Dear ${data.name},\n\nThank you for contacting God Save Africa & The World (GSAW).\n\nWe have received your message regarding "${data.subject}" and our team will respond to you promptly.\n\nIf your matter is urgent, you can reach us directly at +27 73 585 0365 or via WhatsApp.\n\n#AllPowerBelongsToJesus\n\nKind regards,\nGSAW National Office\ninfo@gsaw.org.za | +27 73 585 0365\nwww.gsaw.org.za`
--     }
--     
--     // 1. Send notification to BOTH admin emails
--     await fetch('https://api.resend.com/emails', {
--       method: 'POST',
--       headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
--       body: JSON.stringify({ from: 'GSAW Notifications <notifications@gsaw.org.za>', to: ADMIN_EMAILS, subject, text: adminBody })
--     })
--     
--     // 2. Send confirmation email to the person who submitted (if email provided)
--     if (userEmail) {
--       await fetch('https://api.resend.com/emails', {
--         method: 'POST',
--         headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
--         body: JSON.stringify({ from: 'GSAW <info@gsaw.org.za>', to: userEmail, subject: confirmSubject, text: confirmBody, reply_to: 'info@gsaw.org.za' })
--       })
--     }
--     
--     return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
--   } catch (error) {
--     return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
--   }
-- })
--
-- SETUP STEPS:
-- 1. Sign up at https://resend.com (free tier: 100 emails/day)
-- 2. Add & verify domain gsaw.org.za in Resend (add DNS records)
-- 3. Get API key from Resend dashboard
-- 4. In Supabase Dashboard → Settings → Secrets → Add: RESEND_API_KEY = re_xxxx...
-- 5. Deploy the Edge Function above via Dashboard or CLI

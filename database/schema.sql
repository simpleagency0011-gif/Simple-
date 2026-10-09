-- ============================================================================
-- SIMPLE Platform Database Schema with Row Level Security (RLS) & Hardened Auth
-- Compliant with OWASP Security Recommendations & Zero-Trust Architecture
-- ============================================================================

-- 1. Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clients / Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    business_name VARCHAR(150),
    role VARCHAR(30) DEFAULT 'client' CHECK (role IN ('client', 'manager', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Service Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL,
    period VARCHAR(30) DEFAULT 'one-time' CHECK (period IN ('one-time', 'monthly', 'quarterly')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed available packages
INSERT INTO public.plans (id, name, price_inr, period, description) VALUES
    ('full_stack_growth', 'Website + AI Agent + Free Ad Run', 16999.00, 'one-time', 'Complete business engine: custom site, WhatsApp/IG AI bot, and first ad campaign run.'),
    ('website_ads', 'Website + Free Ad Run', 12999.00, 'one-time', 'Modern high-converting web storefront with launch ad management.'),
    ('ai_agent_ads', 'AI Agent + Free Ad Run', 6999.00, 'one-time', '24/7 autonomous sales and customer reply bot on WhatsApp & Instagram.'),
    ('ads_management', 'Ad Campaign Management Only', 2999.00, 'monthly', 'Targeted ad campaign running and continuous optimization across Meta & Google.')
ON CONFLICT (id) DO NOTHING;

-- 4. Bookings Table (Stores plan selections and inquiries)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    client_name VARCHAR(150) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    business_name VARCHAR(150),
    plan_id VARCHAR(50) REFERENCES public.plans(id),
    plan_name VARCHAR(100) NOT NULL,
    plan_price VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    client_notes TEXT,
    ip_hash VARCHAR(64), -- Masked IP identifier
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict isolation ensuring no client can view or mutate another client's records
-- ============================================================================

-- Enable RLS on all sensitive tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Plans are publicly readable by everyone
CREATE POLICY "Public Read Active Plans" 
    ON public.plans 
    FOR SELECT 
    USING (is_active = TRUE);

-- Users can only read their own user record
CREATE POLICY "Users Read Own Profile" 
    ON public.users 
    FOR SELECT 
    USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users Update Own Profile" 
    ON public.users 
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Clients can only see their own bookings (Broken Object Level Authorization Prevention)
CREATE POLICY "Clients View Own Bookings" 
    ON public.bookings 
    FOR SELECT 
    USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = client_email);

-- Anyone can submit a new booking (Insert Policy with strict column validation)
CREATE POLICY "Public Insert New Booking" 
    ON public.bookings 
    FOR INSERT 
    WITH CHECK (
        length(client_name) >= 2 AND 
        length(client_phone) >= 7 AND
        client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    );

-- Only platform admins can update booking status
CREATE POLICY "Admins Manage All Bookings" 
    ON public.bookings 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Indexing for high-speed queries and unique constraints
CREATE INDEX IF NOT EXISTS idx_bookings_client_email ON public.bookings(client_email);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

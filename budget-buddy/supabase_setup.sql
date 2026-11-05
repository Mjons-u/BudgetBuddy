-- ==============================================================================
-- BudgetBuddy - Supabase Cloud Database Setup (Multi-Device Sync)
-- ==============================================================================
-- Copy and paste this script into your Supabase Dashboard -> SQL Editor -> Run.
-- It creates the tables and security policies to allow multi-device sync across
-- all your phones, laptops, and tablets!
-- ==============================================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    currency TEXT DEFAULT '₱',
    monthly_target NUMERIC DEFAULT 0,
    role TEXT DEFAULT 'Personal account',
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    amount NUMERIC NOT NULL CHECK(amount > 0),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS) so each user only sees their own data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 5. Create Policies for Transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" 
    ON public.transactions FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" 
    ON public.transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" 
    ON public.transactions FOR DELETE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" 
    ON public.transactions FOR UPDATE 
    USING (auth.uid() = user_id);

-- 6. Indexes for ultra fast sync
CREATE INDEX IF NOT EXISTS idx_cloud_tx_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_tx_date ON public.transactions(date);

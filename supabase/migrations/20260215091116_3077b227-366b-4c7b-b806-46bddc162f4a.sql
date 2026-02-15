
-- Step 1: Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 4: RLS on user_roles itself - only admins can read
CREATE POLICY "Admins can read user_roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 5: Drop ALL existing admin write policies and recreate with has_role check

-- tournaments
DROP POLICY IF EXISTS "Admin insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admin update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admin delete tournaments" ON public.tournaments;

CREATE POLICY "Admin insert tournaments" ON public.tournaments
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update tournaments" ON public.tournaments
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete tournaments" ON public.tournaments
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- teams
DROP POLICY IF EXISTS "Admin insert teams" ON public.teams;
DROP POLICY IF EXISTS "Admin update teams" ON public.teams;
DROP POLICY IF EXISTS "Admin delete teams" ON public.teams;

CREATE POLICY "Admin insert teams" ON public.teams
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update teams" ON public.teams
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete teams" ON public.teams
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- players
DROP POLICY IF EXISTS "Admin insert players" ON public.players;
DROP POLICY IF EXISTS "Admin update players" ON public.players;
DROP POLICY IF EXISTS "Admin delete players" ON public.players;

CREATE POLICY "Admin insert players" ON public.players
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update players" ON public.players
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete players" ON public.players
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- matches
DROP POLICY IF EXISTS "Admin insert matches" ON public.matches;
DROP POLICY IF EXISTS "Admin update matches" ON public.matches;
DROP POLICY IF EXISTS "Admin delete matches" ON public.matches;

CREATE POLICY "Admin insert matches" ON public.matches
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update matches" ON public.matches
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete matches" ON public.matches
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- goal_events
DROP POLICY IF EXISTS "Admin insert goal_events" ON public.goal_events;
DROP POLICY IF EXISTS "Admin update goal_events" ON public.goal_events;
DROP POLICY IF EXISTS "Admin delete goal_events" ON public.goal_events;

CREATE POLICY "Admin insert goal_events" ON public.goal_events
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update goal_events" ON public.goal_events
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete goal_events" ON public.goal_events
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- standings_aggregate
DROP POLICY IF EXISTS "Admin manage standings" ON public.standings_aggregate;

CREATE POLICY "Admin manage standings" ON public.standings_aggregate
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- player_stats_aggregate
DROP POLICY IF EXISTS "Admin manage player_stats" ON public.player_stats_aggregate;

CREATE POLICY "Admin manage player_stats" ON public.player_stats_aggregate
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- webhook_config
DROP POLICY IF EXISTS "Admin insert webhook_config" ON public.webhook_config;
DROP POLICY IF EXISTS "Admin update webhook_config" ON public.webhook_config;
DROP POLICY IF EXISTS "Admin delete webhook_config" ON public.webhook_config;
DROP POLICY IF EXISTS "Admin read webhook_config" ON public.webhook_config;

CREATE POLICY "Admin read webhook_config" ON public.webhook_config
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert webhook_config" ON public.webhook_config
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update webhook_config" ON public.webhook_config
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete webhook_config" ON public.webhook_config
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

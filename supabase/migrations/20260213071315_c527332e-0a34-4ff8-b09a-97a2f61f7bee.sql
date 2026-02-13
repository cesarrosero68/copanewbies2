
-- Enums
CREATE TYPE public.match_stage AS ENUM ('REGULAR', 'P1A', 'P1B', 'SEMI', 'P2', 'FINAL', 'THIRD');
CREATE TYPE public.match_status AS ENUM ('scheduled', 'live', 'final', 'locked');
CREATE TYPE public.goal_period AS ENUM ('1', '2', '3', 'OT');

-- Tournament
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  rules_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teams
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  color TEXT DEFAULT '#A8D8EA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, slug)
);

-- Players
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INTEGER NOT NULL,
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matches
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  stage public.match_stage NOT NULL DEFAULT 'REGULAR',
  home_team_id UUID NOT NULL REFERENCES public.teams(id),
  away_team_id UUID NOT NULL REFERENCES public.teams(id),
  venue TEXT,
  start_time TIMESTAMPTZ,
  status public.match_status NOT NULL DEFAULT 'scheduled',
  reg_home_score INTEGER DEFAULT 0,
  reg_away_score INTEGER DEFAULT 0,
  ot_played BOOLEAN DEFAULT false,
  so_played BOOLEAN DEFAULT false,
  ot_winner_team_id UUID REFERENCES public.teams(id),
  so_winner_team_id UUID REFERENCES public.teams(id),
  winner_team_id UUID REFERENCES public.teams(id),
  notes TEXT,
  match_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goal Events
CREATE TABLE public.goal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  period public.goal_period NOT NULL,
  time_mmss TEXT NOT NULL,
  scorer_player_id UUID NOT NULL REFERENCES public.players(id),
  assist_player_id UUID REFERENCES public.players(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standings Aggregate
CREATE TABLE public.standings_aggregate (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  gf INTEGER NOT NULL DEFAULT 0,
  gc INTEGER NOT NULL DEFAULT 0,
  gd INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  rank_calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

-- Player Stats Aggregate
CREATE TABLE public.player_stats_aggregate (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

-- Webhook config table
CREATE TABLE public.webhook_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standings_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_config ENABLE ROW LEVEL SECURITY;

-- Public read policies (dashboard is public)
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public read goal_events" ON public.goal_events FOR SELECT USING (true);
CREATE POLICY "Public read standings" ON public.standings_aggregate FOR SELECT USING (true);
CREATE POLICY "Public read player_stats" ON public.player_stats_aggregate FOR SELECT USING (true);

-- Admin write policies (authenticated users = admin)
CREATE POLICY "Admin insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete tournaments" ON public.tournaments FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update teams" ON public.teams FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete teams" ON public.teams FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert players" ON public.players FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update players" ON public.players FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete players" ON public.players FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update matches" ON public.matches FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete matches" ON public.matches FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert goal_events" ON public.goal_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update goal_events" ON public.goal_events FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete goal_events" ON public.goal_events FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manage standings" ON public.standings_aggregate FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage player_stats" ON public.player_stats_aggregate FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin read webhook_config" ON public.webhook_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin insert webhook_config" ON public.webhook_config FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update webhook_config" ON public.webhook_config FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete webhook_config" ON public.webhook_config FOR DELETE USING (auth.uid() IS NOT NULL);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_webhook_config_updated_at BEFORE UPDATE ON public.webhook_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

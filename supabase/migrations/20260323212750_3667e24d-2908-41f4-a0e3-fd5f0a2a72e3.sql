
-- Create enum for skills player role
CREATE TYPE public.skills_role AS ENUM ('field', 'goalkeeper');

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- skills_players
CREATE TABLE public.skills_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consecutive_number integer NOT NULL,
  full_name text NOT NULL,
  club text NOT NULL,
  role skills_role NOT NULL DEFAULT 'field',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skills_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read skills_players" ON public.skills_players FOR SELECT USING (true);
CREATE POLICY "Public insert skills_players" ON public.skills_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update skills_players" ON public.skills_players FOR UPDATE USING (true);
CREATE POLICY "Public delete skills_players" ON public.skills_players FOR DELETE USING (true);

-- skills_users (staff authentication)
CREATE TABLE public.skills_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skills_users ENABLE ROW LEVEL SECURITY;
-- No public access policies - only via security definer function

-- skills_results
CREATE TABLE public.skills_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.skills_players(id) ON DELETE CASCADE,
  test_number integer NOT NULL,
  attempt_number integer,
  time_seconds integer,
  time_milliseconds integer,
  time_minutes integer,
  score_direct numeric,
  sniper_target text,
  shootout_result text,
  entered_by uuid REFERENCES public.skills_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skills_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read skills_results" ON public.skills_results FOR SELECT USING (true);
CREATE POLICY "Public insert skills_results" ON public.skills_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update skills_results" ON public.skills_results FOR UPDATE USING (true);
CREATE POLICY "Public delete skills_results" ON public.skills_results FOR DELETE USING (true);

-- skills_point_tables
CREATE TABLE public.skills_point_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text UNIQUE NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE public.skills_point_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read skills_point_tables" ON public.skills_point_tables FOR SELECT USING (true);
CREATE POLICY "Public insert skills_point_tables" ON public.skills_point_tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update skills_point_tables" ON public.skills_point_tables FOR UPDATE USING (true);

-- Seed staff users
INSERT INTO public.skills_users (username, password_hash) VALUES
  ('staff1', crypt('staff1234', gen_salt('bf'))),
  ('staff2', crypt('staff2234', gen_salt('bf'))),
  ('staff3', crypt('staff3234', gen_salt('bf'))),
  ('staff4', crypt('staff4234', gen_salt('bf')));

-- Seed point tables
INSERT INTO public.skills_point_tables (table_name, config) VALUES
  ('field_ranking_group', '{"scale": [10, 8, 6, 5, 4, 3, 2, 1], "group_size": 8}'),
  ('goalkeeper_ranking', '[{"position": 1, "points": 10}, {"position": 2, "points": 8}]'),
  ('sniper_targets', '{"top_left": 5, "top_right": 5, "bottom_left": 2, "bottom_right": 2, "center": 8, "num_shots": 5}'),
  ('accuracy_shots', '{"attempt_1": 10, "attempt_2": 7, "attempt_3": 3, "no_goal": 0}'),
  ('shootout_field', '{"goal": 3, "outside": -1, "saved": 1}'),
  ('shootout_goalkeeper', '{"saved": 3, "outside": 1, "goal_against": -1}');

-- Login verification function (security definer to bypass RLS on skills_users)
CREATE OR REPLACE FUNCTION public.verify_skills_login(p_username text, p_password text)
RETURNS TABLE(user_id uuid, user_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT su.id, su.username
  FROM skills_users su
  WHERE su.username = p_username
    AND su.password_hash = crypt(p_password, su.password_hash);
END;
$$;

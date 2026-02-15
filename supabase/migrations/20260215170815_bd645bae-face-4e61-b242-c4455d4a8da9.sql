
-- Add own goal columns to goal_events
ALTER TABLE public.goal_events ADD COLUMN is_own_goal boolean NOT NULL DEFAULT false;
ALTER TABLE public.goal_events ADD COLUMN own_goal_by_player_id uuid REFERENCES public.players(id);

-- Make scorer_player_id nullable (for own goals)
ALTER TABLE public.goal_events ALTER COLUMN scorer_player_id DROP NOT NULL;

-- Create recalculate standings function (admin-only)
CREATE OR REPLACE FUNCTION public.recalculate_standings(p_tournament_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM standings_aggregate WHERE tournament_id = p_tournament_id;
  
  INSERT INTO standings_aggregate (tournament_id, team_id, played, wins, draws, losses, gf, gc, gd, points, rank, rank_calculated_at)
  WITH team_matches AS (
    SELECT 
      t.id as team_id,
      m.id as match_id,
      CASE WHEN m.home_team_id = t.id THEN m.reg_home_score ELSE m.reg_away_score END as scored,
      CASE WHEN m.home_team_id = t.id THEN m.reg_away_score ELSE m.reg_home_score END as conceded
    FROM teams t
    JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
    WHERE t.tournament_id = p_tournament_id
      AND m.tournament_id = p_tournament_id
      AND m.stage = 'REGULAR'
      AND m.status IN ('final', 'locked')
  ),
  team_goal_counts AS (
    SELECT 
      t.id as team_id,
      COALESCE(gf_q.cnt, 0) as gf,
      COALESCE(gc_q.cnt, 0) as gc
    FROM teams t
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as cnt FROM goal_events ge 
      JOIN matches m ON ge.match_id = m.id 
      WHERE ge.team_id = t.id AND m.tournament_id = p_tournament_id AND m.stage = 'REGULAR' AND m.status IN ('final', 'locked')
    ) gf_q ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as cnt FROM goal_events ge 
      JOIN matches m ON ge.match_id = m.id 
      WHERE ge.team_id != t.id AND m.tournament_id = p_tournament_id AND m.stage = 'REGULAR' AND m.status IN ('final', 'locked')
      AND (m.home_team_id = t.id OR m.away_team_id = t.id)
    ) gc_q ON true
    WHERE t.tournament_id = p_tournament_id
  ),
  stats AS (
    SELECT 
      tm.team_id,
      COUNT(*) as played,
      SUM(CASE WHEN tm.scored > tm.conceded THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN tm.scored = tm.conceded THEN 1 ELSE 0 END) as draws,
      SUM(CASE WHEN tm.scored < tm.conceded THEN 1 ELSE 0 END) as losses
    FROM team_matches tm
    GROUP BY tm.team_id
  )
  SELECT 
    p_tournament_id,
    t.id,
    COALESCE(s.played, 0)::int,
    COALESCE(s.wins, 0)::int,
    COALESCE(s.draws, 0)::int,
    COALESCE(s.losses, 0)::int,
    COALESCE(tg.gf, 0)::int,
    COALESCE(tg.gc, 0)::int,
    (COALESCE(tg.gf, 0) - COALESCE(tg.gc, 0))::int,
    (COALESCE(s.wins, 0) * 3 + COALESCE(s.draws, 0))::int,
    ROW_NUMBER() OVER (ORDER BY (COALESCE(s.wins, 0) * 3 + COALESCE(s.draws, 0)) DESC, (COALESCE(tg.gf, 0) - COALESCE(tg.gc, 0)) DESC, COALESCE(tg.gf, 0) DESC)::int,
    now()
  FROM teams t
  LEFT JOIN stats s ON s.team_id = t.id
  LEFT JOIN team_goal_counts tg ON tg.team_id = t.id
  WHERE t.tournament_id = p_tournament_id;
END;
$$;

-- Create recalculate player stats function (admin-only)
CREATE OR REPLACE FUNCTION public.recalculate_player_stats(p_tournament_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM player_stats_aggregate WHERE tournament_id = p_tournament_id;
  
  INSERT INTO player_stats_aggregate (tournament_id, player_id, team_id, goals, assists, points)
  SELECT 
    p_tournament_id,
    p.id,
    p.team_id,
    (SELECT COUNT(*) FROM goal_events ge JOIN matches m ON ge.match_id = m.id 
     WHERE ge.scorer_player_id = p.id AND ge.is_own_goal = false
     AND m.tournament_id = p_tournament_id AND m.status IN ('final', 'locked'))::int,
    (SELECT COUNT(*) FROM goal_events ge JOIN matches m ON ge.match_id = m.id 
     WHERE ge.assist_player_id = p.id 
     AND m.tournament_id = p_tournament_id AND m.status IN ('final', 'locked'))::int,
    ((SELECT COUNT(*) FROM goal_events ge JOIN matches m ON ge.match_id = m.id 
      WHERE ge.scorer_player_id = p.id AND ge.is_own_goal = false
      AND m.tournament_id = p_tournament_id AND m.status IN ('final', 'locked')) +
     (SELECT COUNT(*) FROM goal_events ge JOIN matches m ON ge.match_id = m.id 
      WHERE ge.assist_player_id = p.id 
      AND m.tournament_id = p_tournament_id AND m.status IN ('final', 'locked')))::int
  FROM players p
  JOIN teams t ON p.team_id = t.id
  WHERE t.tournament_id = p_tournament_id;
END;
$$;

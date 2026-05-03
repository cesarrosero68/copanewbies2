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
     AND m.tournament_id = p_tournament_id AND m.status IN ('final', 'locked')
     AND m.stage IN ('REGULAR', 'FINAL'))::int,
    (SELECT COUNT(*) FROM goal_events ge JOIN matches m ON ge.match_id = m.id
     WHERE ge.assist_player_id = p.id
     AND m.tournament_id = p_tournament_id AND m.status IN ('final', 'locked')
     AND m.stage IN ('REGULAR', 'FINAL'))::int,
    ((SELECT COUNT(*) FROM goal_events ge JOIN matches m ON ge.match_id = m.id
      WHERE ge.scorer_player_id = p.id AND ge.is_own_goal = false
      AND m.tournament_id = p_tournament_id AND m.status IN ('final', 'locked')
      AND m.stage IN ('REGULAR', 'FINAL')) +
     (SELECT COUNT(*) FROM goal_events ge JOIN matches m ON ge.match_id = m.id
      WHERE ge.assist_player_id = p.id
      AND m.tournament_id = p_tournament_id AND m.status IN ('final', 'locked')
      AND m.stage IN ('REGULAR', 'FINAL')))::int
  FROM players p
  JOIN teams t ON p.team_id = t.id
  WHERE t.tournament_id = p_tournament_id;
END;
$$;
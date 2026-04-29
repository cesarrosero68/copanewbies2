CREATE OR REPLACE FUNCTION public.advance_playoff_bracket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loser_team_id uuid;
  v_direct_finalist_id uuid;
BEGIN
  IF NEW.stage NOT IN ('P1A', 'P1B', 'SEMI', 'P2') THEN
    RETURN NEW;
  END IF;

  IF NEW.winner_team_id IS NULL OR NEW.winner_team_id IS NOT DISTINCT FROM OLD.winner_team_id THEN
    RETURN NEW;
  END IF;

  IF NEW.winner_team_id = NEW.home_team_id THEN
    v_loser_team_id := NEW.away_team_id;
  ELSIF NEW.winner_team_id = NEW.away_team_id THEN
    v_loser_team_id := NEW.home_team_id;
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.stage = 'P1A' THEN
    UPDATE public.matches
    SET home_team_id = NEW.winner_team_id,
        updated_at = now()
    WHERE tournament_id = NEW.tournament_id
      AND stage = 'SEMI';

    UPDATE public.matches
    SET home_team_id = v_loser_team_id,
        updated_at = now()
    WHERE tournament_id = NEW.tournament_id
      AND stage = 'P2';

  ELSIF NEW.stage = 'P1B' THEN
    UPDATE public.matches
    SET away_team_id = NEW.winner_team_id,
        updated_at = now()
    WHERE tournament_id = NEW.tournament_id
      AND stage = 'SEMI';

    UPDATE public.matches
    SET away_team_id = v_loser_team_id,
        updated_at = now()
    WHERE tournament_id = NEW.tournament_id
      AND stage = 'P2';

  ELSIF NEW.stage = 'SEMI' THEN
    SELECT sa.team_id
    INTO v_direct_finalist_id
    FROM public.standings_aggregate sa
    WHERE sa.tournament_id = NEW.tournament_id
      AND sa.rank = 1
    LIMIT 1;

    UPDATE public.matches
    SET home_team_id = COALESCE(v_direct_finalist_id, home_team_id),
        away_team_id = NEW.winner_team_id,
        updated_at = now()
    WHERE tournament_id = NEW.tournament_id
      AND stage = 'FINAL';

    UPDATE public.matches
    SET home_team_id = v_loser_team_id,
        updated_at = now()
    WHERE tournament_id = NEW.tournament_id
      AND stage = 'THIRD';

  ELSIF NEW.stage = 'P2' THEN
    UPDATE public.matches
    SET away_team_id = NEW.winner_team_id,
        updated_at = now()
    WHERE tournament_id = NEW.tournament_id
      AND stage = 'THIRD';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advance_playoff_bracket_on_winner ON public.matches;

CREATE TRIGGER advance_playoff_bracket_on_winner
AFTER UPDATE OF winner_team_id ON public.matches
FOR EACH ROW
WHEN (NEW.winner_team_id IS NOT NULL)
EXECUTE FUNCTION public.advance_playoff_bracket();
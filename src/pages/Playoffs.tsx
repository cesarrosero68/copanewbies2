import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { IS_PRESEASON } from "@/lib/tournament";
import TeamLogo from "@/components/TeamLogo";

const TOURNAMENT_ID = "a0000000-0000-0000-0000-000000000001";

function BracketMatch({
  match,
  label,
  homePlaceholder,
  awayPlaceholder,
  homeTeamOverride,
  awayTeamOverride,
}: {
  match: any;
  label: string;
  homePlaceholder: string;
  awayPlaceholder: string;
  homeTeamOverride?: any;
  awayTeamOverride?: any;
}) {
  const isPlayed = match?.status === "final" || match?.status === "locked";
  // Prefer the actual teams assigned to the match in the DB. Fall back to the
  // standings-derived override, then to placeholders.
  const homeTeam = match?.home_team ?? homeTeamOverride;
  const awayTeam = match?.away_team ?? awayTeamOverride;
  const showHomePlaceholder = IS_PRESEASON || !homeTeam;
  const showAwayPlaceholder = IS_PRESEASON || !awayTeam;

  const content = (
    <Card className="w-64 hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground font-display uppercase mb-2">{label}</p>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {!showHomePlaceholder && homeTeam && <TeamLogo team={homeTeam} size={20} />}
            <span className="text-sm font-medium">
              {showHomePlaceholder ? homePlaceholder : (homeTeam?.name || "TBD")}
            </span>
          </div>
          {isPlayed && <span className="font-display font-bold">{match.reg_home_score}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!showAwayPlaceholder && awayTeam && <TeamLogo team={awayTeam} size={20} />}
            <span className="text-sm font-medium">
              {showAwayPlaceholder ? awayPlaceholder : (awayTeam?.name || "TBD")}
            </span>
          </div>
          {isPlayed && <span className="font-display font-bold">{match.reg_away_score}</span>}
        </div>
        {match?.ot_played && isPlayed && (
          <p className="text-xs text-muted-foreground mt-1">
            {match.so_played ? "Penales (SO)" : "Overtime (OT)"}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (match && isPlayed) {
    return <Link to={`/match/${match.id}`}>{content}</Link>;
  }
  return content;
}

export default function Playoffs() {
  const { data: playoffMatches } = useQuery({
    queryKey: ["playoff-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .eq("tournament_id", TOURNAMENT_ID)
        .neq("stage", "REGULAR")
        .order("match_number", { ascending: true });
      return data || [];
    },
  });

  // Check if all regular season matches are finished
  const { data: regularMatches } = useQuery({
    queryKey: ["regular-matches-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, status")
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "REGULAR");
      return data || [];
    },
  });

  // Read the actual standings to populate the bracket dynamically
  const { data: standings } = useQuery({
    queryKey: ["playoff-standings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("standings_aggregate")
        .select("rank, team:teams(*)")
        .eq("tournament_id", TOURNAMENT_ID)
        .order("rank", { ascending: true });
      return data || [];
    },
  });

  const allRegularDone = regularMatches && regularMatches.length > 0 &&
    regularMatches.every((m: any) => m.status === "final" || m.status === "locked");

  const getMatch = (stage: string) => {
    return playoffMatches?.find((m: any) => m.stage === stage);
  };

  // Resolve team by rank from standings (only when regular season is done)
  const teamByRank = (rank: number) => {
    if (!allRegularDone) return undefined;
    return standings?.find((s: any) => s.rank === rank)?.team;
  };

  const team1 = teamByRank(1);
  const team2 = teamByRank(2);
  const team3 = teamByRank(3);
  const team4 = teamByRank(4);
  const team5 = teamByRank(5);

  return (
    <div className="container py-8">
      <h1 className="font-display text-4xl font-bold uppercase mb-2">Bracket de Playoffs</h1>
      <p className="text-muted-foreground mb-8">
        #1 pasa directo a la Final
      </p>

      <div className="overflow-x-auto">
        <div className="flex gap-8 items-center min-w-[900px] py-4">
          {/* Round 1 */}
          <div className="flex flex-col gap-8">
            <BracketMatch
              match={getMatch("P1A")}
              label="Playoff 1A"
              homePlaceholder="Puesto 2"
              awayPlaceholder="Puesto 3"
              homeTeamOverride={team2}
              awayTeamOverride={team3}
            />
            <BracketMatch
              match={getMatch("P1B")}
              label="Playoff 1B"
              homePlaceholder="Puesto 4"
              awayPlaceholder="Puesto 5"
              homeTeamOverride={team4}
              awayTeamOverride={team5}
            />
          </div>

          {/* Connectors */}
          <div className="flex flex-col gap-8 text-muted-foreground text-2xl">
            <span>→</span>
            <span>→</span>
          </div>

          {/* Semifinal + P2 */}
          <div className="flex flex-col gap-8">
            <BracketMatch match={getMatch("SEMI")} label="Semifinal" homePlaceholder="Ganador 1A" awayPlaceholder="Ganador 1B" />
            <BracketMatch match={getMatch("P2")} label="Playoff 2" homePlaceholder="Perdedor 1A" awayPlaceholder="Perdedor 1B" />
          </div>

          {/* Connectors */}
          <div className="flex flex-col gap-8 text-muted-foreground text-2xl">
            <span>→</span>
            <span>→</span>
          </div>

          {/* Final + 3rd */}
          <div className="flex flex-col gap-8">
            <BracketMatch
              match={getMatch("FINAL")}
              label="Final"
              homePlaceholder="Ganador Semi"
              awayPlaceholder="Puesto 1"
              awayTeamOverride={team1}
            />
            <BracketMatch match={getMatch("THIRD")} label="3ro / 4to" homePlaceholder="Perdedor Semi" awayPlaceholder="Perdedor P2" />
          </div>
        </div>
      </div>
    </div>
  );
}

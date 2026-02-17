import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { IS_PRESEASON } from "@/lib/tournament";
import TeamLogo from "@/components/TeamLogo";

const TOURNAMENT_ID = "a0000000-0000-0000-0000-000000000001";

function BracketMatch({ match, label, homePlaceholder, awayPlaceholder }: { match: any; label: string; homePlaceholder: string; awayPlaceholder: string }) {
  const isPlayed = match?.status === "final" || match?.status === "locked";
  const showPlaceholders = IS_PRESEASON || !match;

  const content = (
    <Card className="w-64 hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground font-display uppercase mb-2">{label}</p>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {!showPlaceholders && match?.home_team && <TeamLogo team={match.home_team} size={20} />}
            <span className="text-sm font-medium">
              {showPlaceholders ? homePlaceholder : (match?.home_team?.name || "TBD")}
            </span>
          </div>
          {isPlayed && !showPlaceholders && <span className="font-display font-bold">{match.reg_home_score}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!showPlaceholders && match?.away_team && <TeamLogo team={match.away_team} size={20} />}
            <span className="text-sm font-medium">
              {showPlaceholders ? awayPlaceholder : (match?.away_team?.name || "TBD")}
            </span>
          </div>
          {isPlayed && !showPlaceholders && <span className="font-display font-bold">{match.reg_away_score}</span>}
        </div>
        {match?.ot_played && isPlayed && !showPlaceholders && (
          <p className="text-xs text-muted-foreground mt-1">
            {match.so_played ? "Penales (SO)" : "Overtime (OT)"}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (match && !showPlaceholders) {
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

  const getMatch = (stage: string) =>
    playoffMatches?.find((m: any) => m.stage === stage);

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
            <BracketMatch match={getMatch("P1A")} label="Playoff 1A" homePlaceholder="Puesto 2" awayPlaceholder="Puesto 5" />
            <BracketMatch match={getMatch("P1B")} label="Playoff 1B" homePlaceholder="Puesto 3" awayPlaceholder="Puesto 4" />
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
            <BracketMatch match={getMatch("FINAL")} label="Final" homePlaceholder="Ganador Semi" awayPlaceholder="Puesto 1" />
            <BracketMatch match={getMatch("THIRD")} label="3ro / 4to" homePlaceholder="Perdedor Semi" awayPlaceholder="Perdedor P2" />
          </div>
        </div>
      </div>
    </div>
  );
}

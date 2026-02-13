import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const TOURNAMENT_ID = "a0000000-0000-0000-0000-000000000001";

const teamColorMap: Record<string, string> = {
  vikings: "bg-team-vikings",
  reapers: "bg-team-reapers",
  "grey-panthers": "bg-team-panthers",
  "rabbits-chiks": "bg-team-rabbits",
  aguilas: "bg-team-aguilas",
};

function BracketMatch({ match, label }: { match: any; label: string }) {
  const isPlayed = match?.status === "final" || match?.status === "locked";

  return (
    <Link to={match ? `/match/${match.id}` : "#"}>
      <Card className="w-64 hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground font-display uppercase mb-2">{label}</p>
          {match ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${teamColorMap[match.home_team?.slug] || "bg-muted"}`} />
                  <span className="text-sm font-medium">{match.home_team?.name || "TBD"}</span>
                </div>
                {isPlayed && <span className="font-display font-bold">{match.reg_home_score}</span>}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${teamColorMap[match.away_team?.slug] || "bg-muted"}`} />
                  <span className="text-sm font-medium">{match.away_team?.name || "TBD"}</span>
                </div>
                {isPlayed && <span className="font-display font-bold">{match.reg_away_score}</span>}
              </div>
              {match.ot_played && isPlayed && (
                <p className="text-xs text-muted-foreground mt-1">
                  {match.so_played ? "Penales (SO)" : "Overtime (OT)"}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Por definir</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
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

  const { data: standings } = useQuery({
    queryKey: ["standings-playoff"],
    queryFn: async () => {
      const { data } = await supabase
        .from("standings_aggregate")
        .select("*, team:teams(*)")
        .eq("tournament_id", TOURNAMENT_ID)
        .order("rank", { ascending: true });
      return data || [];
    },
  });

  const getMatch = (stage: string) =>
    playoffMatches?.find((m: any) => m.stage === stage);

  const first = standings?.[0]?.team?.name || "#1";

  return (
    <div className="container py-8">
      <h1 className="font-display text-4xl font-bold uppercase mb-2">Bracket de Playoffs</h1>
      <p className="text-muted-foreground mb-8">
        #1 ({first}) pasa directo a la Final
      </p>

      <div className="overflow-x-auto">
        <div className="flex gap-8 items-center min-w-[900px] py-4">
          {/* Round 1 */}
          <div className="flex flex-col gap-8">
            <BracketMatch match={getMatch("P1A")} label="Playoff 1A (#2 vs #5)" />
            <BracketMatch match={getMatch("P1B")} label="Playoff 1B (#3 vs #4)" />
          </div>

          {/* Connectors */}
          <div className="flex flex-col gap-8 text-muted-foreground text-2xl">
            <span>→</span>
            <span>→</span>
          </div>

          {/* Semifinal + P2 */}
          <div className="flex flex-col gap-8">
            <BracketMatch match={getMatch("SEMI")} label="Semifinal (G-1A vs G-1B)" />
            <BracketMatch match={getMatch("P2")} label="Playoff 2 (P-1A vs P-1B)" />
          </div>

          {/* Connectors */}
          <div className="flex flex-col gap-8 text-muted-foreground text-2xl">
            <span>→</span>
            <span>→</span>
          </div>

          {/* Final + 3rd */}
          <div className="flex flex-col gap-8">
            <BracketMatch match={getMatch("FINAL")} label={`Final (G-Semi vs ${first})`} />
            <BracketMatch match={getMatch("THIRD")} label="3ro/4to (P-Semi vs P-P2)" />
          </div>
        </div>
      </div>
    </div>
  );
}

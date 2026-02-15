import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toBogotaDate } from "@/lib/dateUtils";

const teamColorMap: Record<string, string> = {
  vikings: "bg-team-vikings",
  reapers: "bg-team-reapers",
  "grey-panthers": "bg-team-panthers",
  "rabbits-chiks": "bg-team-rabbits",
  aguilas: "bg-team-aguilas",
};

export default function MatchDetail() {
  const { id } = useParams();

  const { data: match } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .eq("id", id)
        .single();
      return data;
    },
  });

  const { data: goalEvents } = useQuery({
    queryKey: ["match-goals", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("goal_events")
        .select("*, scorer:players!goal_events_scorer_player_id_fkey(*), assist:players!goal_events_assist_player_id_fkey(*), team:teams(*), own_goal_player:players!goal_events_own_goal_by_player_id_fkey(*)")
        .eq("match_id", id!)
        .order("period", { ascending: true })
        .order("time_mmss", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  if (!match) return <div className="container py-8 text-center text-muted-foreground">Cargando...</div>;

  const isPlayed = match.status === "final" || match.status === "locked";
  const periods = ["1", "2", "3", "OT"];

  return (
    <div className="container py-8 max-w-3xl">
      {/* Scoreboard */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="text-center mb-4">
            <Badge variant="secondary" className="text-xs">
              {match.stage === "REGULAR" ? `Partido #${match.match_number}` : match.stage}
            </Badge>
            {match.start_time && (
              <p className="text-sm text-muted-foreground mt-1">
                {format(toBogotaDate(match.start_time), "EEEE d MMMM yyyy • HH:mm", { locale: es })}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-8">
            <div className="text-center flex-1">
              <div className={`w-6 h-6 rounded-full mx-auto mb-2 ${teamColorMap[match.home_team?.slug] || "bg-muted"}`} />
              <h2 className="font-display text-xl font-bold">{match.home_team?.name}</h2>
            </div>

            {isPlayed ? (
              <div className="font-display text-5xl font-bold">
                {match.reg_home_score} <span className="text-muted-foreground text-3xl">-</span> {match.reg_away_score}
              </div>
            ) : (
              <div className="font-display text-3xl text-muted-foreground">VS</div>
            )}

            <div className="text-center flex-1">
              <div className={`w-6 h-6 rounded-full mx-auto mb-2 ${teamColorMap[match.away_team?.slug] || "bg-muted"}`} />
              <h2 className="font-display text-xl font-bold">{match.away_team?.name}</h2>
            </div>
          </div>

          {match.ot_played && (
            <div className="text-center mt-4">
              <Badge variant="outline">
                {match.so_played
                  ? `Gana ${match.winner_team_id === match.home_team_id ? match.home_team?.name : match.away_team?.name} en Penales (SO)`
                  : `Gana ${match.winner_team_id === match.home_team_id ? match.home_team?.name : match.away_team?.name} en OT`}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal Events by Period */}
      {isPlayed && goalEvents && goalEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl uppercase">Detalle de Goles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {periods.map((period) => {
              const periodGoals = goalEvents.filter((g: any) => g.period === period);
              if (periodGoals.length === 0) return null;
              return (
                <div key={period}>
                  <h3 className="font-display text-sm uppercase text-muted-foreground mb-2">
                    {period === "OT" ? "Overtime" : `Periodo ${period}`}
                  </h3>
                  <div className="space-y-2">
                    {periodGoals.map((goal: any) => (
                      <div
                        key={goal.id}
                        className={`flex items-center gap-3 p-2 rounded-md ${
                          goal.team_id === match.home_team_id ? "bg-muted/50" : "bg-accent/50"
                        }`}
                      >
                        <span className="text-xs text-muted-foreground font-mono w-12">{goal.time_mmss}</span>
                        <div className={`w-2 h-2 rounded-full ${teamColorMap[goal.team?.slug] || "bg-muted"}`} />
                        {goal.is_own_goal ? (
                          <span className="font-medium text-sm">⚽ Autogol{goal.own_goal_player?.name ? ` (${goal.own_goal_player.name})` : ''}</span>
                        ) : (
                          <span className="font-medium text-sm">⚽ {goal.scorer?.name}</span>
                        )}
                        {goal.assist && (
                          <span className="text-xs text-muted-foreground">
                            (asist. {goal.assist.name})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

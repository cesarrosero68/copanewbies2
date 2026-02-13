import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TOURNAMENT_ID = "a0000000-0000-0000-0000-000000000001";

const teamColorMap: Record<string, string> = {
  vikings: "bg-team-vikings",
  reapers: "bg-team-reapers",
  "grey-panthers": "bg-team-panthers",
  "rabbits-chiks": "bg-team-rabbits",
  aguilas: "bg-team-aguilas"
};

export default function Home() {
  const { data: standings } = useQuery({
    queryKey: ["standings"],
    queryFn: async () => {
      const { data } = await supabase.
      from("standings_aggregate").
      select("*, team:teams(*)").
      eq("tournament_id", TOURNAMENT_ID).
      order("rank", { ascending: true });
      return data || [];
    }
  });

  const { data: recentMatches } = useQuery({
    queryKey: ["recent-matches"],
    queryFn: async () => {
      const { data } = await supabase.
      from("matches").
      select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)").
      eq("tournament_id", TOURNAMENT_ID).
      in("status", ["final", "locked"]).
      order("start_time", { ascending: false }).
      limit(4);
      return data || [];
    }
  });

  const { data: upcomingMatches } = useQuery({
    queryKey: ["upcoming-matches"],
    queryFn: async () => {
      const { data } = await supabase.
      from("matches").
      select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)").
      eq("tournament_id", TOURNAMENT_ID).
      eq("status", "scheduled").
      order("start_time", { ascending: true }).
      limit(4);
      return data || [];
    }
  });

  const { data: topScorers } = useQuery({
    queryKey: ["top-scorers"],
    queryFn: async () => {
      const { data } = await supabase.
      from("player_stats_aggregate").
      select("*, player:players(*), team:teams(*)").
      eq("tournament_id", TOURNAMENT_ID).
      order("goals", { ascending: false }).
      limit(5);
      return data || [];
    }
  });

  const { data: topPoints } = useQuery({
    queryKey: ["top-points"],
    queryFn: async () => {
      const { data } = await supabase.
      from("player_stats_aggregate").
      select("*, player:players(*), team:teams(*)").
      eq("tournament_id", TOURNAMENT_ID).
      order("points", { ascending: false }).
      limit(5);
      return data || [];
    }
  });

  return (
    <div className="container py-8 space-y-8">
      {/* Hero */}
      <section className="text-center py-12 rounded-xl bg-[#2476db]">
        <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-wider text-secondary-foreground">
          Liga de Hockey <span className="text-primary">2026</span>
        </h1>
        <p className="mt-3 text-secondary-foreground/70 text-lg">Temporada Regular • 5 Equipos • 20 Partidos</p>
      </section>

      {/* Recent Results */}
      <section>
        <h2 className="font-display text-2xl font-bold uppercase mb-4">Últimos Resultados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentMatches?.map((match: any) =>
          <Link key={match.id} to={`/match/${match.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-3 h-3 rounded-full ${teamColorMap[match.home_team?.slug] || "bg-muted"}`} />
                      <span className="font-medium text-sm">{match.home_team?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-display text-2xl font-bold px-4">
                      <span>{match.reg_home_score}</span>
                      <span className="text-muted-foreground text-lg">-</span>
                      <span>{match.reg_away_score}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="font-medium text-sm">{match.away_team?.name}</span>
                      <div className={`w-3 h-3 rounded-full ${teamColorMap[match.away_team?.slug] || "bg-muted"}`} />
                    </div>
                  </div>
                  {match.start_time &&
                <p className="text-xs text-muted-foreground text-center mt-2">
                      {format(new Date(match.start_time), "d MMM yyyy", { locale: es })}
                    </p>
                }
                  {match.ot_played &&
                <Badge variant="outline" className="mx-auto mt-1 block w-fit text-xs">
                      {match.so_played ? "Penales (SO)" : "Overtime (OT)"}
                    </Badge>
                }
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </section>

      {/* Upcoming Matches */}
      <section>
        <h2 className="font-display text-2xl font-bold uppercase mb-4">Próximos Partidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingMatches?.map((match: any) =>
          <Card key={match.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-3 h-3 rounded-full ${teamColorMap[match.home_team?.slug] || "bg-muted"}`} />
                    <span className="font-medium text-sm">{match.home_team?.name}</span>
                  </div>
                  <span className="text-muted-foreground font-display text-lg px-4">VS</span>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="font-medium text-sm">{match.away_team?.name}</span>
                    <div className={`w-3 h-3 rounded-full ${teamColorMap[match.away_team?.slug] || "bg-muted"}`} />
                  </div>
                </div>
                {match.start_time &&
              <p className="text-xs text-muted-foreground text-center mt-2">
                    {format(new Date(match.start_time), "EEEE d MMM • HH:mm", { locale: es })}
                  </p>
              }
                <Badge className="mx-auto mt-1 block w-fit text-xs" variant="secondary">
                  {match.stage === "REGULAR" ? `Partido #${match.match_number}` : match.stage}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Standings Snapshot */}
        <section>
          <h2 className="font-display text-2xl font-bold uppercase mb-4">Tabla de Posiciones</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Equipo</th>
                    <th className="p-3 text-center">PJ</th>
                    <th className="p-3 text-center">Pts</th>
                    <th className="p-3 text-center">DG</th>
                  </tr>
                </thead>
                <tbody>
                  {standings?.map((s: any, i: number) =>
                  <tr key={s.team_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-bold">{i + 1}</td>
                      <td className="p-3">
                        <Link to={`/team/${s.team?.slug}`} className="flex items-center gap-2 hover:underline">
                          <div className={`w-3 h-3 rounded-full ${teamColorMap[s.team?.slug] || "bg-muted"}`} />
                          {s.team?.name}
                        </Link>
                      </td>
                      <td className="p-3 text-center">{s.played}</td>
                      <td className="p-3 text-center font-bold">{s.points}</td>
                      <td className="p-3 text-center">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Link to="/standings" className="text-sm text-primary hover:underline mt-2 inline-block">
            Ver tabla completa →
          </Link>
        </section>

        {/* Leaders */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold uppercase mb-4">Goleadores</h2>
            <Card>
              <CardContent className="p-4 space-y-2">
                {topScorers?.map((ps: any, i: number) =>
                <div key={ps.player_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-5">{i + 1}.</span>
                      <div className={`w-2 h-2 rounded-full ${teamColorMap[ps.team?.slug] || "bg-muted"}`} />
                      <span className="text-sm font-medium">{ps.player?.name}</span>
                    </div>
                    <span className="font-display font-bold">{ps.goals}</span>
                  </div>
                )}
                {(!topScorers || topScorers.length === 0) &&
                <p className="text-muted-foreground text-sm">Sin datos aún</p>
                }
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold uppercase mb-4">Mejor Jugador (Puntos)</h2>
            <Card>
              <CardContent className="p-4 space-y-2">
                {topPoints?.map((ps: any, i: number) =>
                <div key={ps.player_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-5">{i + 1}.</span>
                      <div className={`w-2 h-2 rounded-full ${teamColorMap[ps.team?.slug] || "bg-muted"}`} />
                      <span className="text-sm font-medium">{ps.player?.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-display font-bold">{ps.points}</span>
                      <span className="text-muted-foreground text-xs ml-1">({ps.goals}G {ps.assists}A)</span>
                    </div>
                  </div>
                )}
                {(!topPoints || topPoints.length === 0) &&
                <p className="text-muted-foreground text-sm">Sin datos aún</p>
                }
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>);

}
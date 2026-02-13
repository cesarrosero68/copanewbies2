import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TOURNAMENT_ID = "a0000000-0000-0000-0000-000000000001";

const teamColorMap: Record<string, string> = {
  vikings: "bg-team-vikings",
  reapers: "bg-team-reapers",
  "grey-panthers": "bg-team-panthers",
  "rabbits-chiks": "bg-team-rabbits",
  aguilas: "bg-team-aguilas",
};

const statusLabels: Record<string, string> = {
  scheduled: "Programado",
  live: "En Vivo",
  final: "Final",
  locked: "Cerrado",
};

const statusColors: Record<string, string> = {
  scheduled: "secondary",
  live: "destructive",
  final: "default",
  locked: "outline",
};

export default function Schedule() {
  const [teamFilter, setTeamFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", TOURNAMENT_ID)
        .order("name");
      return data || [];
    },
  });

  const { data: matches } = useQuery({
    queryKey: ["all-matches", teamFilter, phaseFilter],
    queryFn: async () => {
      let query = supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .eq("tournament_id", TOURNAMENT_ID)
        .order("match_number", { ascending: true });

      if (phaseFilter === "regular") {
        query = query.eq("stage", "REGULAR");
      } else if (phaseFilter === "playoffs") {
        query = query.neq("stage", "REGULAR");
      }

      const { data } = await query;
      let result = data || [];

      if (teamFilter !== "all") {
        result = result.filter(
          (m: any) => m.home_team_id === teamFilter || m.away_team_id === teamFilter
        );
      }

      return result;
    },
  });

  return (
    <div className="container py-8">
      <h1 className="font-display text-4xl font-bold uppercase mb-2">Programación y Resultados</h1>
      <p className="text-muted-foreground mb-6">Todos los partidos de la temporada</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por equipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            {teams?.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fases</SelectItem>
            <SelectItem value="regular">Fase Regular</SelectItem>
            <SelectItem value="playoffs">Playoffs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {matches?.map((match: any) => {
          const isPlayed = match.status === "final" || match.status === "locked";
          return (
            <Link key={match.id} to={isPlayed ? `/match/${match.id}` : "#"}>
              <Card className={`hover:shadow-md transition-shadow ${isPlayed ? "cursor-pointer" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <Badge variant={statusColors[match.status] as any} className="text-xs shrink-0">
                      {statusLabels[match.status]}
                    </Badge>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${teamColorMap[match.home_team?.slug] || "bg-muted"}`} />
                      <span className="font-medium text-sm truncate">{match.home_team?.name}</span>
                    </div>

                    {isPlayed ? (
                      <div className="font-display text-xl font-bold px-3 shrink-0">
                        {match.reg_home_score} - {match.reg_away_score}
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-display px-3 shrink-0">VS</span>
                    )}

                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="font-medium text-sm truncate">{match.away_team?.name}</span>
                      <div className={`w-3 h-3 rounded-full shrink-0 ${teamColorMap[match.away_team?.slug] || "bg-muted"}`} />
                    </div>

                    <div className="text-xs text-muted-foreground shrink-0 w-28 text-right">
                      {match.start_time
                        ? format(new Date(match.start_time), "d MMM HH:mm", { locale: es })
                        : "TBD"}
                    </div>
                  </div>

                  {match.ot_played && isPlayed && (
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      {match.so_played ? "Gana en Penales (SO)" : "Gana en OT"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

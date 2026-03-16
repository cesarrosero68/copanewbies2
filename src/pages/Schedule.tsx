import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toBogotaDate } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TeamLogo from "@/components/TeamLogo";
import { useQueryClient } from "@tanstack/react-query";

const TOURNAMENT_ID = "a0000000-0000-0000-0000-000000000001";

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
  const queryClient = useQueryClient();

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
    queryKey: ["all-matches", teamFilter],
    queryFn: async () => {
      let query = supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "REGULAR")
        .order("match_number", { ascending: true });

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
    <div className="container py-8 max-w-3xl mx-auto">
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
                  {/* Desktop layout */}
                  <div className="hidden sm:flex items-center justify-between gap-4">
                    <Badge variant={statusColors[match.status] as any} className="text-xs shrink-0">
                      {statusLabels[match.status]}
                    </Badge>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TeamLogo team={match.home_team} size={40} />
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
                      <TeamLogo team={match.away_team} size={40} />
                    </div>

                    <div className="text-xs text-muted-foreground shrink-0 w-28 text-right">
                      {match.start_time
                        ? format(toBogotaDate(match.start_time), "d MMM HH:mm", { locale: es })
                        : "TBD"}
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={statusColors[match.status] as any} className="text-xs">
                        {statusLabels[match.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {match.start_time
                          ? format(toBogotaDate(match.start_time), "d MMM HH:mm", { locale: es })
                          : "TBD"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TeamLogo team={match.home_team} size={36} />
                        <span className="font-medium text-sm truncate">{match.home_team?.name}</span>
                      </div>
                      {isPlayed ? (
                        <span className="font-display text-lg font-bold shrink-0">
                          {match.reg_home_score}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TeamLogo team={match.away_team} size={36} />
                        <span className="font-medium text-sm truncate">{match.away_team?.name}</span>
                      </div>
                      {isPlayed ? (
                        <span className="font-display text-lg font-bold shrink-0">
                          {match.reg_away_score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-display text-sm shrink-0">VS</span>
                      )}
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

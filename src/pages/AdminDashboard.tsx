import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Session } from "@supabase/supabase-js";

const TOURNAMENT_ID = "a0000000-0000-0000-0000-000000000001";

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate("/admin/login");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate("/admin/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session!.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!session,
  });

  const { data: matches } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .eq("tournament_id", TOURNAMENT_ID)
        .order("match_number");
      return data || [];
    },
    enabled: !!session && isAdmin === true,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading || checkingAdmin) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!session) return null;
  if (isAdmin === false) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p className="text-muted-foreground">No tienes permisos de administrador.</p>
        <Button variant="outline" onClick={handleLogout}>Cerrar sesión</Button>
      </div>
    </div>
  );

  const statusLabels: Record<string, string> = {
    scheduled: "Programado",
    live: "En Vivo",
    final: "Final",
    locked: "Cerrado",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary text-secondary-foreground border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <h1 className="font-display text-lg font-bold uppercase">🏒 Admin Panel</h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-secondary-foreground/60">{session.user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <h2 className="font-display text-2xl font-bold uppercase mb-6">Gestión de Partidos</h2>

        <div className="space-y-3">
          {matches?.map((match: any) => (
            <MatchRow key={match.id} match={match} queryClient={queryClient} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchRow({ match, queryClient }: { match: any; queryClient: any }) {
  const [editing, setEditing] = useState(false);
  const [homeScore, setHomeScore] = useState(match.reg_home_score?.toString() || "0");
  const [awayScore, setAwayScore] = useState(match.reg_away_score?.toString() || "0");
  const [otPlayed, setOtPlayed] = useState(match.ot_played || false);
  const [soPlayed, setSoPlayed] = useState(match.so_played || false);
  const [winnerId, setWinnerId] = useState(match.winner_team_id || "");

  const isPlayoff = match.stage !== "REGULAR";
  const isLocked = match.status === "locked";

  const updateMatch = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("matches").update(updates).eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({ title: "Partido actualizado" });
      setEditing(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveScore = () => {
    const updates: any = {
      reg_home_score: parseInt(homeScore),
      reg_away_score: parseInt(awayScore),
    };
    if (isPlayoff) {
      updates.ot_played = otPlayed;
      updates.so_played = soPlayed;
      if (winnerId) {
        updates.winner_team_id = winnerId;
        updates.ot_winner_team_id = otPlayed && !soPlayed ? winnerId : null;
        updates.so_winner_team_id = soPlayed ? winnerId : null;
      }
    }
    updateMatch.mutate(updates);
  };

  const closeMatch = () => {
    updateMatch.mutate({ status: "final" });
  };

  const lockMatch = () => {
    updateMatch.mutate({ status: "locked" });
  };

  const statusColors: Record<string, string> = {
    scheduled: "secondary",
    live: "destructive",
    final: "default",
    locked: "outline",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={statusColors[match.status] as any} className="text-xs">
              {match.status === "scheduled" ? "Programado" : match.status === "live" ? "En Vivo" : match.status === "final" ? "Final" : "Cerrado"}
            </Badge>
            <span className="text-xs text-muted-foreground">#{match.match_number}</span>
            <span className="font-medium text-sm">
              {match.home_team?.name} vs {match.away_team?.name}
            </span>
            {(match.status === "final" || match.status === "locked") && (
              <span className="font-display font-bold">
                {match.reg_home_score} - {match.reg_away_score}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {match.status === "scheduled" && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Cargar Resultado
              </Button>
            )}
            {match.status === "final" && !isLocked && (
              <Button size="sm" variant="outline" onClick={lockMatch}>
                Bloquear
              </Button>
            )}
            {(match.status === "final" || match.status === "locked") && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">Goles</Button>
                </DialogTrigger>
                <DialogContent>
                  <GoalEventsManager matchId={match.id} homeTeamId={match.home_team_id} awayTeamId={match.away_team_id} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-4 p-4 bg-muted rounded-md space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{match.home_team?.name}</Label>
                <Input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
              </div>
              <div>
                <Label>{match.away_team?.name}</Label>
                <Input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
              </div>
            </div>

            {isPlayoff && (
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={otPlayed} onChange={(e) => setOtPlayed(e.target.checked)} />
                    OT jugado
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={soPlayed} onChange={(e) => setSoPlayed(e.target.checked)} />
                    Penales (SO)
                  </label>
                </div>
                {(otPlayed || soPlayed) && (
                  <div>
                    <Label>Ganador</Label>
                    <Select value={winnerId} onValueChange={setWinnerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ganador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={match.home_team_id}>{match.home_team?.name}</SelectItem>
                        <SelectItem value={match.away_team_id}>{match.away_team?.name}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={saveScore}>Guardar</Button>
              <Button size="sm" variant="outline" onClick={closeMatch}>Cerrar Partido (Final)</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoalEventsManager({ matchId, homeTeamId, awayTeamId }: { matchId: string; homeTeamId: string; awayTeamId: string }) {
  const queryClient = useQueryClient();
  const [teamId, setTeamId] = useState(homeTeamId);
  const [period, setPeriod] = useState("1");
  const [time, setTime] = useState("");
  const [scorerId, setScorerId] = useState("");
  const [assistId, setAssistId] = useState("");

  const { data: goals } = useQuery({
    queryKey: ["admin-goals", matchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("goal_events")
        .select("*, scorer:players!goal_events_scorer_player_id_fkey(*), assist:players!goal_events_assist_player_id_fkey(*), team:teams(*)")
        .eq("match_id", matchId)
        .order("period")
        .order("time_mmss");
      return data || [];
    },
  });

  const { data: homePlayers } = useQuery({
    queryKey: ["players", homeTeamId],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("*").eq("team_id", homeTeamId).order("jersey_number");
      return data || [];
    },
  });

  const { data: awayPlayers } = useQuery({
    queryKey: ["players", awayTeamId],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("*").eq("team_id", awayTeamId).order("jersey_number");
      return data || [];
    },
  });

  const players = teamId === homeTeamId ? homePlayers : awayPlayers;

  const { data: teams } = useQuery({
    queryKey: ["match-teams", homeTeamId, awayTeamId],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").in("id", [homeTeamId, awayTeamId]);
      return data || [];
    },
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("goal_events").insert({
        match_id: matchId,
        team_id: teamId,
        period: period as any,
        time_mmss: time,
        scorer_player_id: scorerId,
        assist_player_id: assistId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-goals", matchId] });
      setTime("");
      setScorerId("");
      setAssistId("");
      toast({ title: "Gol registrado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from("goal_events").delete().eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-goals", matchId] });
      toast({ title: "Gol eliminado" });
    },
  });

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="font-display text-lg uppercase">Eventos de Gol</DialogTitle>
      </DialogHeader>

      <div className="mt-4 space-y-3">
        {goals?.map((g: any) => (
          <div key={g.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
            <div>
              <span className="font-mono text-xs mr-2">P{g.period} {g.time_mmss}</span>
              <span className="font-medium">{g.scorer?.name}</span>
              {g.assist && <span className="text-muted-foreground"> (A: {g.assist.name})</span>}
              <span className="text-xs text-muted-foreground ml-2">- {g.team?.name}</span>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => deleteGoal.mutate(g.id)}>
              ✕
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3 border-t pt-4">
        <h4 className="font-medium text-sm">Agregar Gol</h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Equipo</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {teams?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Periodo</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1er</SelectItem>
                <SelectItem value="2">2do</SelectItem>
                <SelectItem value="3">3er</SelectItem>
                <SelectItem value="OT">OT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">Tiempo (mm:ss)</Label>
          <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="05:30" />
        </div>

        <div>
          <Label className="text-xs">Goleador</Label>
          <Select value={scorerId} onValueChange={setScorerId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {players?.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Asistente (opcional)</Label>
          <Select value={assistId} onValueChange={setAssistId}>
            <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Ninguno</SelectItem>
              {players?.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => addGoal.mutate()} disabled={!scorerId || !time} className="w-full">
          Agregar Gol
        </Button>
      </div>
    </div>
  );
}

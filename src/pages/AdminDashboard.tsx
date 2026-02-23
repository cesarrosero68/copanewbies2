import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
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
import { ChevronLeft } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary text-secondary-foreground border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Sitio
            </Link>
            <span className="text-secondary-foreground/30">|</span>
            <h1 className="font-display text-lg font-bold uppercase">🏒 Admin Panel</h1>
          </div>
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

  const closeMatch = async () => {
    const { data: goals } = await supabase
      .from("goal_events")
      .select("team_id")
      .eq("match_id", match.id);

    const homeGoals = (goals || []).filter((g: any) => g.team_id === match.home_team_id).length;
    const awayGoals = (goals || []).filter((g: any) => g.team_id === match.away_team_id).length;
    const expectedHome = parseInt(homeScore) || match.reg_home_score || 0;
    const expectedAway = parseInt(awayScore) || match.reg_away_score || 0;

    if (homeGoals !== expectedHome || awayGoals !== expectedAway) {
      toast({
        title: "Error de validación",
        description: `Los eventos de gol (${homeGoals}-${awayGoals}) no coinciden con el marcador (${expectedHome}-${expectedAway}). Registra todos los goles antes de cerrar.`,
        variant: "destructive",
      });
      return;
    }

    const updates: any = { status: "final" };
    if (!isPlayoff) {
      if (expectedHome > expectedAway) updates.winner_team_id = match.home_team_id;
      else if (expectedAway > expectedHome) updates.winner_team_id = match.away_team_id;
      else updates.winner_team_id = null;
    }

    const { error } = await supabase.from("matches").update(updates).eq("id", match.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.rpc("recalculate_standings", { p_tournament_id: TOURNAMENT_ID });
    await supabase.rpc("recalculate_player_stats", { p_tournament_id: TOURNAMENT_ID });

    queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    toast({ title: "Partido cerrado y agregados recalculados" });
    setEditing(false);
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
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">Goles</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <GoalEventsManager matchId={match.id} homeTeamId={match.home_team_id} awayTeamId={match.away_team_id} />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">Sanciones</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <PenaltyEventsManager matchId={match.id} homeTeamId={match.home_team_id} awayTeamId={match.away_team_id} />
              </DialogContent>
            </Dialog>
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
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [ownGoalPlayerId, setOwnGoalPlayerId] = useState("");

  const { data: goals } = useQuery({
    queryKey: ["admin-goals", matchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("goal_events")
        .select("*, scorer:players!goal_events_scorer_player_id_fkey(*), assist:players!goal_events_assist_player_id_fkey(*), team:teams(*), own_goal_player:players!goal_events_own_goal_by_player_id_fkey(*)")
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

  const scoringTeamPlayers = teamId === homeTeamId ? homePlayers : awayPlayers;
  const defendingTeamPlayers = teamId === homeTeamId ? awayPlayers : homePlayers;

  const { data: teams } = useQuery({
    queryKey: ["match-teams", homeTeamId, awayTeamId],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").in("id", [homeTeamId, awayTeamId]);
      return data || [];
    },
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const insert: any = {
        match_id: matchId,
        team_id: teamId,
        period: period as any,
        time_mmss: time,
        is_own_goal: isOwnGoal,
      };
      if (isOwnGoal) {
        insert.scorer_player_id = null;
        insert.assist_player_id = null;
        insert.own_goal_by_player_id = ownGoalPlayerId && ownGoalPlayerId !== "none" ? ownGoalPlayerId : null;
      } else {
        insert.scorer_player_id = scorerId;
        insert.assist_player_id = assistId && assistId !== "none" ? assistId : null;
        insert.own_goal_by_player_id = null;
      }
      const { error } = await supabase.from("goal_events").insert(insert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-goals", matchId] });
      setTime("");
      setScorerId("");
      setAssistId("");
      setIsOwnGoal(false);
      setOwnGoalPlayerId("");
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

  const canAdd = isOwnGoal ? !!time : (!!scorerId && !!time);

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
              {g.is_own_goal ? (
                <span className="font-medium text-destructive">Autogol{g.own_goal_player ? ` (${g.own_goal_player.name})` : ''}</span>
              ) : (
                <span className="font-medium">{g.scorer?.name}</span>
              )}
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
            <Label className="text-xs">Equipo que anota</Label>
            <Select value={teamId} onValueChange={(v) => { setTeamId(v); setScorerId(""); setAssistId(""); setOwnGoalPlayerId(""); }}>
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

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isOwnGoal} onChange={(e) => { setIsOwnGoal(e.target.checked); setScorerId(""); setAssistId(""); setOwnGoalPlayerId(""); }} />
          Gol en contra (autogol)
        </label>

        {!isOwnGoal ? (
          <>
            <div>
              <Label className="text-xs">Goleador</Label>
              <Select value={scorerId} onValueChange={setScorerId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {scoringTeamPlayers?.map((p: any) => (
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
                  <SelectItem value="none">Ninguno</SelectItem>
                  {scoringTeamPlayers?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div>
            <Label className="text-xs">Autogol por (jugador del equipo que defiende)</Label>
            <Select value={ownGoalPlayerId} onValueChange={setOwnGoalPlayerId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Desconocido</SelectItem>
                {defendingTeamPlayers?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={() => addGoal.mutate()} disabled={!canAdd} className="w-full">
          Agregar Gol
        </Button>
      </div>
    </div>
  );
}

const PENALTY_TYPES = [
  { code: "BC", desc: "BODY CHECKING" },
  { code: "BDG", desc: "BOARDING" },
  { code: "BE", desc: "BUTT ENDING" },
  { code: "BP", desc: "BENCH PENALTY" },
  { code: "BS", desc: "BROKEN STICK" },
  { code: "CC", desc: "CROSS CHECKING" },
  { code: "CFB", desc: "CC FROM BEHIND" },
  { code: "CH", desc: "CHARGING" },
  { code: "DG", desc: "DELAY OF GAME" },
  { code: "ELB", desc: "ELBOWING" },
  { code: "FI", desc: "FIGHTING" },
  { code: "FOP", desc: "FALLING ON PUCK" },
  { code: "FOV", desc: "FACE OFF VIOL." },
  { code: "GE", desc: "GAME EJECTION" },
  { code: "GM", desc: "GAME MISSCONDUCT" },
  { code: "HKG", desc: "HOOKING" },
  { code: "HO", desc: "HOLDING" },
  { code: "HP", desc: "HAND PASS" },
  { code: "HS", desc: "HIGH STICK" },
  { code: "IE", desc: "ILLEGAL EQUIPMENT" },
  { code: "INT", desc: "INTERFERENCE" },
  { code: "INTG", desc: "INT. OF GOALTENDER" },
  { code: "KNE", desc: "KNEEING" },
  { code: "MP", desc: "MATCH PENALTY" },
  { code: "MSC", desc: "MISSCONDUCT" },
  { code: "OA", desc: "OFFICIAL ABUSE" },
  { code: "PS", desc: "PENALTY SHOOT" },
  { code: "RO", desc: "ROUGHING" },
  { code: "SL", desc: "SLASHING" },
  { code: "SP", desc: "SPEARING" },
  { code: "TMM", desc: "TOO MANY MEN" },
  { code: "TR", desc: "TRIPPING" },
  { code: "USC", desc: "UNSPORTSMANLIKE" },
];

const PREDEFINED_TIMES = [
  { label: "1:30", value: "01:30" },
  { label: "4:00", value: "04:00" },
  { label: "10:00", value: "10:00" },
  { label: "Manual", value: "manual" },
];

function PenaltyEventsManager({ matchId, homeTeamId, awayTeamId }: { matchId: string; homeTeamId: string; awayTeamId: string }) {
  const queryClient = useQueryClient();
  const [teamId, setTeamId] = useState(homeTeamId);
  const [period, setPeriod] = useState("1");
  const [timePreset, setTimePreset] = useState("01:30");
  const [minutes, setMinutes] = useState("1");
  const [seconds, setSeconds] = useState("30");
  const [playerId, setPlayerId] = useState("");
  const [penaltyType, setPenaltyType] = useState("");

  const { data: penalties } = useQuery({
    queryKey: ["admin-penalties", matchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("penalty_events")
        .select("*, player:players(*), team:teams(*)")
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

  const { data: teams } = useQuery({
    queryKey: ["match-teams", homeTeamId, awayTeamId],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").in("id", [homeTeamId, awayTeamId]);
      return data || [];
    },
  });

  const currentPlayers = teamId === homeTeamId ? homePlayers : awayPlayers;

  const addPenalty = useMutation({
    mutationFn: async () => {
      const mins = parseInt(minutes) || 0;
      const secs = parseInt(seconds) || 0;
      if (mins < 0 || mins > 60) throw new Error("Minutos debe ser entre 0 y 60");
      if (secs < 0 || secs > 59) throw new Error("Segundos debe ser entre 0 y 59");
      const timeMmss = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      const { error } = await supabase.from("penalty_events").insert({
        match_id: matchId,
        team_id: teamId,
        player_id: playerId,
        period: period,
        time_mmss: timeMmss,
        penalty_type: penaltyType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-penalties", matchId] });
      setTimePreset("01:30");
      setMinutes("1");
      setSeconds("30");
      setPlayerId("");
      setPenaltyType("");
      toast({ title: "Sanción registrada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePenalty = useMutation({
    mutationFn: async (penaltyId: string) => {
      const { error } = await supabase.from("penalty_events").delete().eq("id", penaltyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-penalties", matchId] });
      toast({ title: "Sanción eliminada" });
    },
  });

  const canAdd = !!playerId && !!penaltyType && (minutes !== "" || seconds !== "");

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="font-display text-lg uppercase">Sanciones</DialogTitle>
      </DialogHeader>

      <div className="mt-4 space-y-3">
        {penalties?.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
            <div>
              <span className="font-mono text-xs mr-2">P{p.period} {p.time_mmss}</span>
              <span className="font-medium">#{p.player?.jersey_number} {p.player?.name}</span>
              <Badge variant="outline" className="ml-2 text-xs">{p.penalty_type}</Badge>
              <span className="text-xs text-muted-foreground ml-2">- {p.team?.name}</span>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => deletePenalty.mutate(p.id)}>
              ✕
            </Button>
          </div>
        ))}
        {(!penalties || penalties.length === 0) && (
          <p className="text-sm text-muted-foreground">Sin sanciones registradas</p>
        )}
      </div>

      <div className="mt-6 space-y-3 border-t pt-4">
        <h4 className="font-medium text-sm">Agregar Sanción</h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Equipo</Label>
            <Select value={teamId} onValueChange={(v) => { setTeamId(v); setPlayerId(""); }}>
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
          <Label className="text-xs">Tiempo de sanción</Label>
          <Select value={timePreset} onValueChange={(v) => {
            setTimePreset(v);
            if (v !== "manual") {
              const [m, s] = v.split(":");
              setMinutes(String(parseInt(m)));
              setSeconds(String(parseInt(s)));
            }
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PREDEFINED_TIMES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {timePreset === "manual" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Minutos (0-60)</Label>
              <Input type="number" min={0} max={60} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="00" />
            </div>
            <div>
              <Label className="text-xs">Segundos (0-59)</Label>
              <Input type="number" min={0} max={59} value={seconds} onChange={(e) => setSeconds(e.target.value)} placeholder="00" />
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs">Jugador</Label>
          <Select value={playerId} onValueChange={setPlayerId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar jugador" /></SelectTrigger>
            <SelectContent>
              {currentPlayers?.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Tipo de sanción</Label>
          <Select value={penaltyType} onValueChange={setPenaltyType}>
            <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
            <SelectContent>
              {PENALTY_TYPES.map((pt) => (
                <SelectItem key={pt.code} value={pt.code}>{pt.code} - {pt.desc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => addPenalty.mutate()} disabled={!canAdd} className="w-full">
          Agregar Sanción
        </Button>
      </div>
    </div>
  );
}

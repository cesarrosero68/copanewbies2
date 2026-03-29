import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { SkillsPlayer, SkillsResult, getStaffSession } from "@/lib/skillsTypes";
import { buildPositionAndPointsMaps, getBestTimedResultMs, SkillsPointScales } from "@/lib/skillsRanking";
import { Trash2, Check } from "lucide-react";

interface Props {
  testNumber: number;
  title: string;
  players: SkillsPlayer[];
  results: SkillsResult[];
  onRefresh: () => void;
  pointScales: SkillsPointScales;
  roleFilter?: "field" | "goalkeeper" | "all";
  maxAttempts?: number;
  showMinutes?: boolean;
}

export default function TimedTestTab({
  testNumber,
  title,
  players,
  results,
  onRefresh,
  pointScales,
  roleFilter = "all",
  maxAttempts = 2,
  showMinutes = false,
}: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [seconds, setSeconds] = useState("");
  const [milliseconds, setMilliseconds] = useState("");
  const [minutes, setMinutes] = useState("");
  const [filter, setFilter] = useState<"field" | "goalkeeper">(roleFilter === "all" ? "field" : roleFilter);

  const filteredPlayers = players.filter(
    (player) => player.is_active && (roleFilter === "all" ? player.role === filter : player.role === roleFilter),
  );
  const testResults = results.filter((result) => result.test_number === testNumber);

  const playerResults = (playerId: string) =>
    testResults
      .filter((result) => result.player_id === playerId)
      .sort((a, b) => (a.attempt_number || 0) - (b.attempt_number || 0));

  const distinctAttempts = (playerId: string) => new Set(playerResults(playerId).map((result) => result.attempt_number).filter((n): n is number => n != null));

  const bestTime = (playerId: string) => getBestTimedResultMs(playerResults(playerId));

  const nextAttempt = (playerId: string) => {
    const attempts = distinctAttempts(playerId);
    if (attempts.size >= maxAttempts) return null;

    for (let index = 1; index <= maxAttempts; index += 1) {
      if (!attempts.has(index)) return index;
    }

    return null;
  };

  const handleSave = async () => {
    if (!selectedPlayer) return;

    const attempt = nextAttempt(selectedPlayer);
    if (!attempt) {
      toast({ title: "Ya completó todos los intentos" });
      return;
    }

    const staff = getStaffSession();
    const row: Record<string, string | number | null> = {
      player_id: selectedPlayer,
      test_number: testNumber,
      attempt_number: attempt,
      time_seconds: seconds ? parseInt(seconds, 10) : 0,
      time_milliseconds: milliseconds ? parseInt(milliseconds, 10) : 0,
      entered_by: staff?.user_id || null,
    };

    if (showMinutes) {
      row.time_minutes = minutes ? parseInt(minutes, 10) : 0;
    }

    const { error } = await supabase.from("skills_results" as any).insert(row);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setSeconds("");
    setMilliseconds("");
    setMinutes("");
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("skills_results" as any).delete().eq("id", id);
    onRefresh();
  };

  const formatTime = (result: SkillsResult) => {
    if (showMinutes) {
      return `${result.time_minutes || 0}:${String(result.time_seconds || 0).padStart(2, "0")}`;
    }

    return `${result.time_seconds || 0}.${String(result.time_milliseconds || 0).padStart(3, "0")}`;
  };

  const formatMs = (ms: number) => {
    if (showMinutes) {
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      return `${mins}:${String(secs).padStart(2, "0")}`;
    }

    const secs = Math.floor(ms / 1000);
    const millis = ms % 1000;
    return `${secs}.${String(millis).padStart(3, "0")}`;
  };

  const rankedPlayers = filteredPlayers
    .map((player) => ({ player, best: bestTime(player.id) }))
    .filter((entry): entry is { player: SkillsPlayer; best: number } => entry.best !== null)
    .sort((a, b) => a.best - b.best);

  const { rankMap, ptsMap } = buildPositionAndPointsMaps(
    rankedPlayers.map((entry) => entry.player),
    pointScales,
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{title}</h3>

      {roleFilter === "all" && (
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "field" ? "default" : "outline"} onClick={() => setFilter("field")}>
            Jugadores
          </Button>
          <Button size="sm" variant={filter === "goalkeeper" ? "default" : "outline"} onClick={() => setFilter("goalkeeper")}>
            Arqueros
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-3 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <Label>Jugador</Label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {filteredPlayers.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  #{player.consecutive_number} {player.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showMinutes && (
          <div>
            <Label>Min</Label>
            <Input value={minutes} onChange={(event) => setMinutes(event.target.value)} type="number" min="0" />
          </div>
        )}
        <div>
          <Label>Seg</Label>
          <Input value={seconds} onChange={(event) => setSeconds(event.target.value)} type="number" min="0" />
        </div>
        {!showMinutes && (
          <div>
            <Label>Ms</Label>
            <Input
              value={milliseconds}
              onChange={(event) => setMilliseconds(event.target.value)}
              type="number"
              min="0"
              max="999"
            />
          </div>
        )}
        <div className="flex items-end">
          <Button onClick={handleSave}>OK</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Jugador</TableHead>
            {Array.from({ length: maxAttempts }, (_, index) => (
              <TableHead key={index}>Int. {index + 1}</TableHead>
            ))}
            <TableHead>Mejor</TableHead>
            <TableHead></TableHead>
            <TableHead>Pos.</TableHead>
            <TableHead>Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPlayers.map((player) => {
            const attempts = playerResults(player.id);
            const best = bestTime(player.id);
            const completedAttempts = new Set(attempts.map((result) => result.attempt_number)).size;

            return (
              <TableRow key={player.id}>
                <TableCell>{player.consecutive_number}</TableCell>
                <TableCell className="font-medium">{player.full_name}</TableCell>
                {Array.from({ length: maxAttempts }, (_, index) => {
                  const result = attempts.find((entry) => entry.attempt_number === index + 1);
                  return (
                    <TableCell key={index}>
                      {result ? (
                        <span className="flex items-center gap-1">
                          {formatTime(result)}
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(result.id)}>
                            <Trash2 className="text-destructive h-3 w-3" />
                          </Button>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="font-bold">{best !== null ? formatMs(best) : "—"}</TableCell>
                <TableCell>{completedAttempts >= maxAttempts ? <Check className="h-4 w-4 text-primary" /> : null}</TableCell>
                <TableCell className="font-bold text-primary">{rankMap[player.id] || "—"}</TableCell>
                <TableCell className="font-bold text-primary">{ptsMap[player.id] ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

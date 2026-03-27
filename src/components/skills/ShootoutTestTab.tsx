import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { SkillsPlayer, SkillsResult, getStaffSession } from "@/lib/skillsTypes";
import { buildPositionAndPointsMaps, SkillsPointScales } from "@/lib/skillsRanking";
import { Trash2 } from "lucide-react";

interface ShootoutOption {
  key: string;
  label: string;
  points: number;
}

interface Props {
  testNumber: number;
  title: string;
  players: SkillsPlayer[];
  results: SkillsResult[];
  onRefresh: () => void;
  pointScales: SkillsPointScales;
  roleFilter: "field" | "goalkeeper";
  options: ShootoutOption[];
  maxShootouts?: number;
}

export default function ShootoutTestTab({
  testNumber,
  title,
  players,
  results,
  onRefresh,
  pointScales,
  roleFilter,
  options,
  maxShootouts = 3,
}: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const testResults = results.filter((result) => result.test_number === testNumber);
  const activePlayers = players.filter((player) => player.is_active && player.role === roleFilter);

  const playerShootouts = (playerId: string) =>
    testResults
      .filter((result) => result.player_id === playerId)
      .sort((a, b) => (a.attempt_number || 0) - (b.attempt_number || 0));

  const playerTotal = (playerId: string) =>
    playerShootouts(playerId).reduce((sum, result) => sum + Number(result.score_direct || 0), 0);

  const nextAttempt = (playerId: string) => {
    const shots = playerShootouts(playerId);
    return shots.length >= maxShootouts ? null : shots.length + 1;
  };

  const handleShot = async (key: string, points: number) => {
    if (!selectedPlayer) return;

    const attempt = nextAttempt(selectedPlayer);
    if (!attempt) {
      toast({ title: "Ya completó todos los shootouts" });
      return;
    }

    const staff = getStaffSession();
    const { error } = await supabase.from("skills_results" as any).insert({
      player_id: selectedPlayer,
      test_number: testNumber,
      attempt_number: attempt,
      shootout_result: key,
      score_direct: points,
      entered_by: staff?.user_id || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("skills_results" as any).delete().eq("id", id);
    onRefresh();
  };

  const ranked = activePlayers
    .map((player) => ({ player, total: playerTotal(player.id), hasResults: playerShootouts(player.id).length > 0 }))
    .filter((entry) => entry.hasResults)
    .sort((a, b) => b.total - a.total);

  const { rankMap, ptsMap } = buildPositionAndPointsMaps(
    ranked.map((entry) => entry.player),
    pointScales,
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{title}</h3>

      <div className="space-y-3 rounded-md border bg-muted/30 p-3">
        <div>
          <Label>Jugador</Label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {activePlayers.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  #{player.consecutive_number} {player.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer && nextAttempt(selectedPlayer) && (
          <div>
            <Label>Shootout #{nextAttempt(selectedPlayer)}:</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {options.map((option) => (
                <Button
                  key={option.key}
                  size="sm"
                  variant={option.points < 0 ? "destructive" : "outline"}
                  onClick={() => handleShot(option.key, option.points)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Jugador</TableHead>
            {Array.from({ length: maxShootouts }, (_, index) => (
              <TableHead key={index}>S{index + 1}</TableHead>
            ))}
            <TableHead>Total</TableHead>
            <TableHead>Pos.</TableHead>
            <TableHead>Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activePlayers.map((player) => {
            const shots = playerShootouts(player.id);
            return (
              <TableRow key={player.id}>
                <TableCell>{player.consecutive_number}</TableCell>
                <TableCell className="font-medium">{player.full_name}</TableCell>
                {Array.from({ length: maxShootouts }, (_, index) => {
                  const shot = shots.find((result) => result.attempt_number === index + 1);
                  return (
                    <TableCell key={index}>
                      {shot ? (
                        <span className="flex items-center gap-1">
                          {shot.score_direct}
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleDelete(shot.id)}>
                            <Trash2 className="text-destructive h-3 w-3" />
                          </Button>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="font-bold">{playerTotal(player.id)}</TableCell>
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

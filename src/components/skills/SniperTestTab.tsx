import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { SkillsPlayer, SkillsResult, SNIPER_LABELS, SNIPER_POINTS, getStaffSession } from "@/lib/skillsTypes";
import { buildPositionAndPointsMaps, SkillsPointScales } from "@/lib/skillsRanking";
import { Trash2 } from "lucide-react";

interface Props {
  players: SkillsPlayer[];
  results: SkillsResult[];
  onRefresh: () => void;
  pointScales: SkillsPointScales;
  numShots?: number;
}

export default function SniperTestTab({ players, results, onRefresh, pointScales, numShots = 5 }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const testResults = results.filter((result) => result.test_number === 3);
  const activePlayers = players.filter((player) => player.is_active);

  const playerShots = (playerId: string) =>
    testResults
      .filter((result) => result.player_id === playerId)
      .sort((a, b) => (a.attempt_number || 0) - (b.attempt_number || 0));

  const playerTotal = (playerId: string) =>
    playerShots(playerId).reduce((sum, result) => sum + (SNIPER_POINTS[result.sniper_target || ""] || 0), 0);

  const nextShot = (playerId: string) => {
    const shots = playerShots(playerId);
    return shots.length >= numShots ? null : shots.length + 1;
  };

  const handleShot = async (target: string) => {
    if (!selectedPlayer) return;

    const attempt = nextShot(selectedPlayer);
    if (!attempt) {
      toast({ title: "Ya completó todos los tiros" });
      return;
    }

    const staff = getStaffSession();
    const { error } = await supabase.from("skills_results" as any).insert({
      player_id: selectedPlayer,
      test_number: 3,
      attempt_number: attempt,
      sniper_target: target,
      score_direct: SNIPER_POINTS[target] || 0,
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
    .map((player) => ({ player, total: playerTotal(player.id), hasResults: playerShots(player.id).length > 0 }))
    .filter((entry) => entry.hasResults)
    .sort((a, b) => b.total - a.total);

  const { rankMap, ptsMap } = buildPositionAndPointsMaps(
    ranked.map((entry) => entry.player),
    pointScales,
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Test 3 — Sniper</h3>

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

        {selectedPlayer && nextShot(selectedPlayer) && (
          <div>
            <Label>Tiro #{nextShot(selectedPlayer)} — Seleccionar zona:</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(SNIPER_LABELS).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={key === "miss" ? "destructive" : key === "center" ? "default" : "outline"}
                  onClick={() => handleShot(key)}
                >
                  {label}
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
            {Array.from({ length: numShots }, (_, index) => (
              <TableHead key={index}>T{index + 1}</TableHead>
            ))}
            <TableHead>Total</TableHead>
            <TableHead>Pos.</TableHead>
            <TableHead>Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activePlayers.map((player) => {
            const shots = playerShots(player.id);
            return (
              <TableRow key={player.id}>
                <TableCell>{player.consecutive_number}</TableCell>
                <TableCell className="font-medium">{player.full_name}</TableCell>
                {Array.from({ length: numShots }, (_, index) => {
                  const shot = shots.find((result) => result.attempt_number === index + 1);
                  return (
                    <TableCell key={index}>
                      {shot ? (
                        <span className="flex items-center gap-1">
                          {SNIPER_POINTS[shot.sniper_target || ""] ?? 0}
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

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

const ACCURACY_OPTIONS = [
  { key: "attempt_1", label: "1er intento (10 pts)", points: 10 },
  { key: "attempt_2", label: "2do intento (7 pts)", points: 7 },
  { key: "attempt_3", label: "3er intento (3 pts)", points: 3 },
  { key: "no_goal", label: "No anotó (0 pts)", points: 0 },
];

interface Props {
  players: SkillsPlayer[];
  results: SkillsResult[];
  onRefresh: () => void;
  pointScales: SkillsPointScales;
}

export default function AccuracyTestTab({ players, results, onRefresh, pointScales }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const testResults = results.filter((result) => result.test_number === 4);
  const activePlayers = players.filter((player) => player.is_active);

  const playerResult = (playerId: string) => testResults.find((result) => result.player_id === playerId);

  const handleSelect = async (key: string, points: number) => {
    if (!selectedPlayer) return;

    if (playerResult(selectedPlayer)) {
      toast({ title: "Ya tiene resultado, elimínelo primero" });
      return;
    }

    const staff = getStaffSession();
    const { error } = await supabase.from("skills_results" as any).insert({
      player_id: selectedPlayer,
      test_number: 4,
      attempt_number: 1,
      score_direct: points,
      sniper_target: key,
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
    .map((player) => ({ player, score: playerResult(player.id)?.score_direct ?? null }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => Number(b.score) - Number(a.score));

  const { rankMap, ptsMap } = buildPositionAndPointsMaps(
    ranked.map((entry) => entry.player),
    pointScales,
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Test 4 — Puntería</h3>

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
                  #{player.consecutive_number} {player.full_name} ({player.role === "goalkeeper" ? "GK" : "J"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer && !playerResult(selectedPlayer) && (
          <div className="flex flex-wrap gap-2">
            {ACCURACY_OPTIONS.map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={option.points === 0 ? "destructive" : "outline"}
                onClick={() => handleSelect(option.key, option.points)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Jugador</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Pts test</TableHead>
            <TableHead></TableHead>
            <TableHead>Pos.</TableHead>
            <TableHead>Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activePlayers.map((player) => {
            const result = playerResult(player.id);
            return (
              <TableRow key={player.id}>
                <TableCell>{player.consecutive_number}</TableCell>
                <TableCell className="font-medium">{player.full_name}</TableCell>
                <TableCell>{player.role === "goalkeeper" ? "GK" : "J"}</TableCell>
                <TableCell>{result ? ACCURACY_OPTIONS.find((option) => option.key === result.sniper_target)?.label || "—" : "—"}</TableCell>
                <TableCell className="font-bold">{result ? result.score_direct : "—"}</TableCell>
                <TableCell>
                  {result ? (
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(result.id)}>
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  ) : null}
                </TableCell>
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

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { SkillsPlayer, SkillsResult, SNIPER_LABELS, SNIPER_POINTS, getStaffSession } from "@/lib/skillsTypes";
import { Trash2 } from "lucide-react";

interface Props {
  players: SkillsPlayer[];
  results: SkillsResult[];
  onRefresh: () => void;
  numShots?: number;
}

export default function SniperTestTab({ players, results, onRefresh, numShots = 5 }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const testResults = results.filter(r => r.test_number === 3);
  const activePlayers = players.filter(p => p.is_active);

  const playerShots = (playerId: string) =>
    testResults.filter(r => r.player_id === playerId).sort((a, b) => (a.attempt_number || 0) - (b.attempt_number || 0));

  const playerTotal = (playerId: string) =>
    playerShots(playerId).reduce((sum, r) => sum + (SNIPER_POINTS[r.sniper_target || ''] || 0), 0);

  const nextShot = (playerId: string) => {
    const shots = playerShots(playerId);
    return shots.length >= numShots ? null : shots.length + 1;
  };

  const handleShot = async (target: string) => {
    if (!selectedPlayer) return;
    const attempt = nextShot(selectedPlayer);
    if (!attempt) { toast({ title: "Ya completó todos los tiros" }); return; }
    const staff = getStaffSession();
    const { error } = await supabase.from('skills_results' as any).insert({
      player_id: selectedPlayer,
      test_number: 3,
      attempt_number: attempt,
      sniper_target: target,
      score_direct: SNIPER_POINTS[target] || 0,
      entered_by: staff?.user_id || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('skills_results' as any).delete().eq('id', id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Test 3 — Sniper</h3>

      <div className="p-3 border rounded-md bg-muted/30 space-y-3">
        <div>
          <Label>Jugador</Label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {activePlayers.map(p => (
                <SelectItem key={p.id} value={p.id}>#{p.consecutive_number} {p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer && nextShot(selectedPlayer) && (
          <div>
            <Label>Tiro #{nextShot(selectedPlayer)} — Seleccionar zona:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(SNIPER_LABELS).map(([key, label]) => (
                <Button key={key} size="sm" variant={key === 'miss' ? 'destructive' : key === 'center' ? 'default' : 'outline'} onClick={() => handleShot(key)}>
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
            {Array.from({ length: numShots }, (_, i) => <TableHead key={i}>T{i + 1}</TableHead>)}
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activePlayers.map(p => {
            const shots = playerShots(p.id);
            return (
              <TableRow key={p.id}>
                <TableCell>{p.consecutive_number}</TableCell>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                {Array.from({ length: numShots }, (_, i) => {
                  const s = shots.find(r => r.attempt_number === i + 1);
                  return (
                    <TableCell key={i}>
                      {s ? (
                        <span className="flex items-center gap-1">
                          {SNIPER_POINTS[s.sniper_target || ''] ?? 0}
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </span>
                      ) : '—'}
                    </TableCell>
                  );
                })}
                <TableCell className="font-bold">{playerTotal(p.id)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

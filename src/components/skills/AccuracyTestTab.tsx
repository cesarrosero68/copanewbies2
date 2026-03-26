import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { SkillsPlayer, SkillsResult, getStaffSession } from "@/lib/skillsTypes";
import { Trash2 } from "lucide-react";

const ACCURACY_OPTIONS = [
  { key: 'attempt_1', label: '1er intento (10 pts)', points: 10 },
  { key: 'attempt_2', label: '2do intento (7 pts)', points: 7 },
  { key: 'attempt_3', label: '3er intento (3 pts)', points: 3 },
  { key: 'no_goal', label: 'No anotó (0 pts)', points: 0 },
];

interface Props {
  players: SkillsPlayer[];
  results: SkillsResult[];
  onRefresh: () => void;
}

export default function AccuracyTestTab({ players, results, onRefresh }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const testResults = results.filter(r => r.test_number === 4);
  const activePlayers = players.filter(p => p.is_active);

  const playerResult = (playerId: string) => testResults.find(r => r.player_id === playerId);

  const handleSelect = async (key: string, points: number) => {
    if (!selectedPlayer) return;
    if (playerResult(selectedPlayer)) { toast({ title: "Ya tiene resultado, elimínelo primero" }); return; }
    const staff = getStaffSession();
    const { error } = await supabase.from('skills_results' as any).insert({
      player_id: selectedPlayer,
      test_number: 4,
      attempt_number: 1,
      score_direct: points,
      sniper_target: key,
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
      <h3 className="text-lg font-bold">Test 4 — Puntería</h3>

      <div className="p-3 border rounded-md bg-muted/30 space-y-3">
        <div>
          <Label>Jugador</Label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {activePlayers.map(p => (
                <SelectItem key={p.id} value={p.id}>#{p.consecutive_number} {p.full_name} ({p.role === 'goalkeeper' ? 'GK' : 'J'})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer && !playerResult(selectedPlayer) && (
          <div className="flex flex-wrap gap-2">
            {ACCURACY_OPTIONS.map(o => (
              <Button key={o.key} size="sm" variant={o.points === 0 ? 'destructive' : 'outline'} onClick={() => handleSelect(o.key, o.points)}>
                {o.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {(() => {
        const ranked = activePlayers
          .map(p => ({ player: p, score: playerResult(p.id)?.score_direct ?? null }))
          .filter(x => x.score !== null)
          .sort((a, b) => (b.score as number) - (a.score as number));
        const rankMap: Record<string, number> = {};
        ranked.forEach((x, i) => { rankMap[x.player.id] = i + 1; });

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Pts</TableHead>
                <TableHead></TableHead>
                <TableHead>Pos.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activePlayers.map(p => {
                const r = playerResult(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.consecutive_number}</TableCell>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.role === 'goalkeeper' ? 'GK' : 'J'}</TableCell>
                    <TableCell>{r ? ACCURACY_OPTIONS.find(o => o.key === r.sniper_target)?.label || '—' : '—'}</TableCell>
                    <TableCell className="font-bold">{r ? r.score_direct : '—'}</TableCell>
                    <TableCell>{r && <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}</TableCell>
                    <TableCell className="font-bold text-primary">{rankMap[p.id] || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        );
      })()}
    </div>
  );
}

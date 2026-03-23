import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { SkillsPlayer, SkillsResult, getStaffSession } from "@/lib/skillsTypes";
import { Trash2 } from "lucide-react";

interface ShootoutOption { key: string; label: string; points: number; }

interface Props {
  testNumber: number;
  title: string;
  players: SkillsPlayer[];
  results: SkillsResult[];
  onRefresh: () => void;
  roleFilter: 'field' | 'goalkeeper';
  options: ShootoutOption[];
  maxShootouts?: number;
}

export default function ShootoutTestTab({ testNumber, title, players, results, onRefresh, roleFilter, options, maxShootouts = 3 }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const testResults = results.filter(r => r.test_number === testNumber);
  const activePlayers = players.filter(p => p.is_active && p.role === roleFilter);

  const playerShootouts = (playerId: string) =>
    testResults.filter(r => r.player_id === playerId).sort((a, b) => (a.attempt_number || 0) - (b.attempt_number || 0));

  const playerTotal = (playerId: string) =>
    playerShootouts(playerId).reduce((sum, r) => sum + (r.score_direct || 0), 0);

  const nextAttempt = (playerId: string) => {
    const shots = playerShootouts(playerId);
    return shots.length >= maxShootouts ? null : shots.length + 1;
  };

  const handleShot = async (key: string, points: number) => {
    if (!selectedPlayer) return;
    const attempt = nextAttempt(selectedPlayer);
    if (!attempt) { toast({ title: "Ya completó todos los shootouts" }); return; }
    const staff = getStaffSession();
    const { error } = await supabase.from('skills_results' as any).insert({
      player_id: selectedPlayer,
      test_number: testNumber,
      attempt_number: attempt,
      shootout_result: key,
      score_direct: points,
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
      <h3 className="text-lg font-bold">{title}</h3>

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

        {selectedPlayer && nextAttempt(selectedPlayer) && (
          <div>
            <Label>Shootout #{nextAttempt(selectedPlayer)}:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {options.map(o => (
                <Button key={o.key} size="sm" variant={o.points < 0 ? 'destructive' : 'outline'} onClick={() => handleShot(o.key, o.points)}>
                  {o.label}
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
            {Array.from({ length: maxShootouts }, (_, i) => <TableHead key={i}>S{i + 1}</TableHead>)}
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activePlayers.map(p => {
            const shots = playerShootouts(p.id);
            return (
              <TableRow key={p.id}>
                <TableCell>{p.consecutive_number}</TableCell>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                {Array.from({ length: maxShootouts }, (_, i) => {
                  const s = shots.find(r => r.attempt_number === i + 1);
                  return (
                    <TableCell key={i}>
                      {s ? (
                        <span className="flex items-center gap-1">
                          {s.score_direct}
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

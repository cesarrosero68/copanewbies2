import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { SkillsPlayer, SkillsResult, getStaffSession } from "@/lib/skillsTypes";
import { Trash2, Check } from "lucide-react";

interface Props {
  testNumber: number;
  title: string;
  players: SkillsPlayer[];
  results: SkillsResult[];
  onRefresh: () => void;
  roleFilter?: 'field' | 'goalkeeper' | 'all';
  maxAttempts?: number;
  showMinutes?: boolean;
}

export default function TimedTestTab({ testNumber, title, players, results, onRefresh, roleFilter = 'all', maxAttempts = 2, showMinutes = false }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [seconds, setSeconds] = useState("");
  const [milliseconds, setMilliseconds] = useState("");
  const [minutes, setMinutes] = useState("");
  const [filter, setFilter] = useState<'field' | 'goalkeeper'>(roleFilter === 'all' ? 'field' : roleFilter);

  const filteredPlayers = players.filter(p => p.is_active && (roleFilter === 'all' ? p.role === filter : p.role === roleFilter));
  const testResults = results.filter(r => r.test_number === testNumber);

  const playerResults = (playerId: string) => testResults.filter(r => r.player_id === playerId);

  // Get distinct attempt numbers recorded for a player
  const distinctAttempts = (playerId: string) => {
    const pr = playerResults(playerId);
    const attempts = new Set(pr.map(r => r.attempt_number));
    return attempts;
  };

  const bestTime = (playerId: string) => {
    const pr = playerResults(playerId);
    if (pr.length === 0) return null;
    return pr.reduce((best, r) => {
      const total = (r.time_minutes || 0) * 60000 + (r.time_seconds || 0) * 1000 + (r.time_milliseconds || 0);
      return total < best ? total : best;
    }, Infinity);
  };

  const nextAttempt = (playerId: string) => {
    const attempts = distinctAttempts(playerId);
    if (attempts.size >= maxAttempts) return null;
    // Find next available attempt number
    for (let i = 1; i <= maxAttempts; i++) {
      if (!attempts.has(i)) return i;
    }
    return null;
  };

  const handleSave = async () => {
    if (!selectedPlayer) return;
    const attempt = nextAttempt(selectedPlayer);
    if (!attempt) { toast({ title: "Ya completó todos los intentos" }); return; }
    const staff = getStaffSession();
    const row: any = {
      player_id: selectedPlayer,
      test_number: testNumber,
      attempt_number: attempt,
      time_seconds: seconds ? parseInt(seconds) : 0,
      time_milliseconds: milliseconds ? parseInt(milliseconds) : 0,
      entered_by: staff?.user_id || null,
    };
    if (showMinutes) row.time_minutes = minutes ? parseInt(minutes) : 0;
    const { error } = await supabase.from('skills_results' as any).insert(row);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSeconds(""); setMilliseconds(""); setMinutes("");
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('skills_results' as any).delete().eq('id', id);
    onRefresh();
  };

  const formatTime = (r: SkillsResult) => {
    if (showMinutes) return `${r.time_minutes || 0}:${String(r.time_seconds || 0).padStart(2, '0')}`;
    return `${r.time_seconds || 0}.${String(r.time_milliseconds || 0).padStart(3, '0')}`;
  };

  const formatMs = (ms: number) => {
    if (showMinutes) { const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000); return `${m}:${String(s).padStart(2, '0')}`; }
    const s = Math.floor(ms / 1000); const mss = ms % 1000;
    return `${s}.${String(mss).padStart(3, '0')}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{title}</h3>

      {roleFilter === 'all' && (
        <div className="flex gap-2">
          <Button size="sm" variant={filter === 'field' ? 'default' : 'outline'} onClick={() => setFilter('field')}>Jugadores</Button>
          <Button size="sm" variant={filter === 'goalkeeper' ? 'default' : 'outline'} onClick={() => setFilter('goalkeeper')}>Arqueros</Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 border rounded-md bg-muted/30">
        <div className="col-span-2 md:col-span-1">
          <Label>Jugador</Label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {filteredPlayers.map(p => (
                <SelectItem key={p.id} value={p.id}>#{p.consecutive_number} {p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showMinutes && <div><Label>Min</Label><Input value={minutes} onChange={e => setMinutes(e.target.value)} type="number" min="0" /></div>}
        <div><Label>Seg</Label><Input value={seconds} onChange={e => setSeconds(e.target.value)} type="number" min="0" /></div>
        {!showMinutes && <div><Label>Ms</Label><Input value={milliseconds} onChange={e => setMilliseconds(e.target.value)} type="number" min="0" max="999" /></div>}
        <div className="flex items-end"><Button onClick={handleSave}>OK</Button></div>
      </div>

      {(() => {
        const POINTS_SCALE = [10, 8, 6, 5, 4, 3, 2, 1];
        const ranked = filteredPlayers
          .map(p => ({ player: p, best: bestTime(p.id) }))
          .filter(x => x.best !== null && x.best !== Infinity)
          .sort((a, b) => a.best! - b.best!);
        const rankMap: Record<string, number> = {};
        const ptsMap: Record<string, number> = {};
        ranked.forEach((x, i) => {
          rankMap[x.player.id] = i + 1;
          ptsMap[x.player.id] = POINTS_SCALE[i % POINTS_SCALE.length];
        });

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Jugador</TableHead>
                {Array.from({ length: maxAttempts }, (_, i) => <TableHead key={i}>Int. {i + 1}</TableHead>)}
                <TableHead>Mejor</TableHead>
                <TableHead></TableHead>
                <TableHead>Pos.</TableHead>
                <TableHead>Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map(p => {
                const pr = playerResults(p.id);
                const bt = bestTime(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.consecutive_number}</TableCell>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    {Array.from({ length: maxAttempts }, (_, i) => {
                      const r = pr.find(r => r.attempt_number === i + 1);
                      return (
                        <TableCell key={i}>
                          {r ? (
                            <span className="flex items-center gap-1">
                              {formatTime(r)}
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(r.id)}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </span>
                          ) : '—'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="font-bold">{bt !== null && bt !== Infinity ? formatMs(bt) : '—'}</TableCell>
                    <TableCell>{new Set(pr.map(r => r.attempt_number)).size >= maxAttempts && <Check className="w-4 h-4 text-green-600" />}</TableCell>
                    <TableCell className="font-bold text-primary">{rankMap[p.id] || '—'}</TableCell>
                    <TableCell className="font-bold text-accent-foreground">{ptsMap[p.id] ?? '—'}</TableCell>
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

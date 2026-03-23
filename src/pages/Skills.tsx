import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillsPlayer, SkillsResult, SNIPER_POINTS } from "@/lib/skillsTypes";
import { LogIn } from "lucide-react";

export default function Skills() {
  const [players, setPlayers] = useState<SkillsPlayer[]>([]);
  const [results, setResults] = useState<SkillsResult[]>([]);

  const fetchData = async () => {
    const [pRes, rRes] = await Promise.all([
      supabase.from('skills_players' as any).select('*').eq('is_active', true).order('consecutive_number'),
      supabase.from('skills_results' as any).select('*'),
    ]);
    if (pRes.data) setPlayers(pRes.data as any);
    if (rRes.data) setResults(rRes.data as any);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const byTest = (tn: number) => results.filter(r => r.test_number === tn);

  // Helper: best time for timed tests (1, 2, 7)
  const bestTimeMs = (playerId: string, testNum: number) => {
    const pr = byTest(testNum).filter(r => r.player_id === playerId);
    if (pr.length === 0) return null;
    return Math.min(...pr.map(r => (r.time_minutes || 0) * 60000 + (r.time_seconds || 0) * 1000 + (r.time_milliseconds || 0)));
  };

  // Timed test ranking points (cycling groups of 8: 10-8-6-5-4-3-2-1)
  const timedRankingPoints = (testNum: number, roleFilter: 'field' | 'goalkeeper') => {
    const scale = [10, 8, 6, 5, 4, 3, 2, 1];
    const eligible = players.filter(p => p.role === roleFilter);
    const withTimes = eligible.map(p => ({ player: p, time: bestTimeMs(p.id, testNum) })).filter(x => x.time !== null) as { player: SkillsPlayer; time: number }[];
    withTimes.sort((a, b) => a.time - b.time);
    const pointsMap: Record<string, number> = {};
    withTimes.forEach((x, i) => {
      const groupPos = i % scale.length;
      pointsMap[x.player.id] = scale[groupPos];
    });
    return pointsMap;
  };

  // GK ranking (1st=10, 2nd=8)
  const gkTimedPoints = (testNum: number) => {
    const gkScale = [10, 8, 6, 5, 4, 3, 2, 1];
    const gks = players.filter(p => p.role === 'goalkeeper');
    const withTimes = gks.map(p => ({ player: p, time: bestTimeMs(p.id, testNum) })).filter(x => x.time !== null) as { player: SkillsPlayer; time: number }[];
    withTimes.sort((a, b) => a.time - b.time);
    const pm: Record<string, number> = {};
    withTimes.forEach((x, i) => { pm[x.player.id] = gkScale[i] || 0; });
    return pm;
  };

  // Direct score sum for a test
  const directScore = (playerId: string, testNum: number) => {
    const pr = byTest(testNum).filter(r => r.player_id === playerId);
    if (testNum === 3) return pr.reduce((s, r) => s + (SNIPER_POINTS[r.sniper_target || ''] || 0), 0);
    return pr.reduce((s, r) => s + (r.score_direct || 0), 0);
  };

  // Ranking 1: Fastest Skater = Test1 + Test2 points
  const ranking1Field = useMemo(() => {
    const t1 = timedRankingPoints(1, 'field');
    const t2 = timedRankingPoints(2, 'field');
    return players.filter(p => p.role === 'field').map(p => ({
      player: p,
      test1: t1[p.id] || 0,
      test2: t2[p.id] || 0,
      total: (t1[p.id] || 0) + (t2[p.id] || 0),
    })).sort((a, b) => b.total - a.total);
  }, [players, results]);

  const ranking1GK = useMemo(() => {
    const t1 = gkTimedPoints(1);
    const t2 = gkTimedPoints(2);
    return players.filter(p => p.role === 'goalkeeper').map(p => ({
      player: p,
      test1: t1[p.id] || 0,
      test2: t2[p.id] || 0,
      total: (t1[p.id] || 0) + (t2[p.id] || 0),
    })).sort((a, b) => b.total - a.total);
  }, [players, results]);

  // Ranking 2: Best Sniper = Test3 + Test4 + Test5 (field only)
  const ranking2 = useMemo(() => {
    return players.filter(p => p.role === 'field').map(p => ({
      player: p,
      test3: directScore(p.id, 3),
      test4: directScore(p.id, 4),
      test5: directScore(p.id, 5),
      total: directScore(p.id, 3) + directScore(p.id, 4) + directScore(p.id, 5),
    })).sort((a, b) => b.total - a.total);
  }, [players, results]);

  // Ranking 3: Best GK = Test1 + Test2 + Test4 + Test6 + Test7
  const ranking3 = useMemo(() => {
    const t1 = gkTimedPoints(1);
    const t2 = gkTimedPoints(2);
    const t7 = gkTimedPoints(7);
    return players.filter(p => p.role === 'goalkeeper').map(p => ({
      player: p,
      test1: t1[p.id] || 0,
      test2: t2[p.id] || 0,
      test4: directScore(p.id, 4),
      test6: directScore(p.id, 6),
      test7: t7[p.id] || 0,
      total: (t1[p.id] || 0) + (t2[p.id] || 0) + directScore(p.id, 4) + directScore(p.id, 6) + (t7[p.id] || 0),
    })).sort((a, b) => b.total - a.total);
  }, [players, results]);

  const formatMs = (ms: number | null) => {
    if (ms === null) return '—';
    if (ms >= 60000) { const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000); return `${m}:${String(s).padStart(2, '0')}`; }
    const s = Math.floor(ms / 1000); const mss = ms % 1000;
    return `${s}.${String(mss).padStart(3, '0')}`;
  };

  const RankingTable = ({ data, columns }: { data: { player: SkillsPlayer; total: number; [k: string]: any }[]; columns: { key: string; label: string }[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">Pos</TableHead>
          <TableHead>Jugador</TableHead>
          <TableHead>Club</TableHead>
          {columns.map(c => <TableHead key={c.key} className="text-center">{c.label}</TableHead>)}
          <TableHead className="text-center font-bold">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={row.player.id}>
            <TableCell className="font-bold">{i + 1}</TableCell>
            <TableCell>#{row.player.consecutive_number} {row.player.full_name}</TableCell>
            <TableCell>{row.player.club}</TableCell>
            {columns.map(c => <TableCell key={c.key} className="text-center">{row[c.key]}</TableCell>)}
            <TableCell className="text-center font-bold text-primary">{row.total}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // Results by test
  const TestResultsTable = ({ testNum }: { testNum: number }) => {
    const tr = byTest(testNum);
    const isTimed = [1, 2, 7].includes(testNum);

    if (isTimed) {
      const grouped = players.map(p => {
        const pr = tr.filter(r => r.player_id === p.id);
        const bt = bestTimeMs(p.id, testNum);
        return { player: p, results: pr, best: bt };
      }).filter(x => x.results.length > 0).sort((a, b) => (a.best || Infinity) - (b.best || Infinity));

      return (
        <Table>
          <TableHeader><TableRow><TableHead>Pos</TableHead><TableHead>Jugador</TableHead><TableHead>Club</TableHead><TableHead>Mejor Tiempo</TableHead></TableRow></TableHeader>
          <TableBody>
            {grouped.map((g, i) => (
              <TableRow key={g.player.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>#{g.player.consecutive_number} {g.player.full_name} <Badge variant="outline" className="ml-1">{g.player.role === 'goalkeeper' ? 'GK' : 'J'}</Badge></TableCell>
                <TableCell>{g.player.club}</TableCell>
                <TableCell className="font-bold">{formatMs(g.best)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    // Score-based tests
    const grouped = players.map(p => {
      const score = directScore(p.id, testNum);
      const hasResults = tr.some(r => r.player_id === p.id);
      return { player: p, score, hasResults };
    }).filter(x => x.hasResults).sort((a, b) => b.score - a.score);

    return (
      <Table>
        <TableHeader><TableRow><TableHead>Pos</TableHead><TableHead>Jugador</TableHead><TableHead>Club</TableHead><TableHead>Puntos</TableHead></TableRow></TableHeader>
        <TableBody>
          {grouped.map((g, i) => (
            <TableRow key={g.player.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>#{g.player.consecutive_number} {g.player.full_name} <Badge variant="outline" className="ml-1">{g.player.role === 'goalkeeper' ? 'GK' : 'J'}</Badge></TableCell>
              <TableCell>{g.player.club}</TableCell>
              <TableCell className="font-bold">{g.score}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const testNames = ['', 'T1 - Fastest Lap', 'T2 - Fastest Circuit', 'T3 - Target Sniper', 'T4 - Goal Sniper', 'T5 - Penalty Shot', 'T6 - Penalty Save', 'T7 - Goalie Equipment'];

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold uppercase">🏒 Skills Competition</h1>
        <Link to="/skills/login">
          <Button size="sm" variant="outline"><LogIn className="w-4 h-4 mr-1" /> Staff</Button>
        </Link>
      </div>

      <Tabs defaultValue="ranking1">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="ranking1">🏃 Fastest Skater</TabsTrigger>
          <TabsTrigger value="ranking2">🎯 Best Sniper</TabsTrigger>
          <TabsTrigger value="ranking3">🧤 Best Goalkeeper</TabsTrigger>
          <TabsTrigger value="results">📊 Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking1" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Ranking Fastest Skater — Jugadores</CardTitle></CardHeader>
            <CardContent>
              <RankingTable data={ranking1Field} columns={[{ key: 'test1', label: 'T1' }, { key: 'test2', label: 'T2' }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ranking Fastest Skater — Arqueros</CardTitle></CardHeader>
            <CardContent>
              <RankingTable data={ranking1GK} columns={[{ key: 'test1', label: 'T1' }, { key: 'test2', label: 'T2' }]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking2">
          <Card>
            <CardHeader><CardTitle>Ranking Best Sniper — Jugadores</CardTitle></CardHeader>
            <CardContent>
              <RankingTable data={ranking2} columns={[{ key: 'test3', label: 'T3' }, { key: 'test4', label: 'T4' }, { key: 'test5', label: 'T5' }]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking3">
          <Card>
            <CardHeader><CardTitle>Ranking Best Goalkeeper</CardTitle></CardHeader>
            <CardContent>
              <RankingTable data={ranking3} columns={[{ key: 'test1', label: 'T1' }, { key: 'test2', label: 'T2' }, { key: 'test4', label: 'T4' }, { key: 'test6', label: 'T6' }, { key: 'test7', label: 'T7' }]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Tabs defaultValue="t1">
            <TabsList className="flex flex-wrap h-auto gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <TabsTrigger key={n} value={`t${n}`}>{testNames[n]}</TabsTrigger>
              ))}
            </TabsList>
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <TabsContent key={n} value={`t${n}`}>
                <Card>
                  <CardHeader><CardTitle>Test {n} — {testNames[n]}</CardTitle></CardHeader>
                  <CardContent><TestResultsTable testNum={n} /></CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

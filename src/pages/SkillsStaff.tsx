import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStaffSession, clearStaffSession, SkillsPlayer, SkillsResult } from "@/lib/skillsTypes";
import PlayersTab from "@/components/skills/PlayersTab";
import TimedTestTab from "@/components/skills/TimedTestTab";
import SniperTestTab from "@/components/skills/SniperTestTab";
import AccuracyTestTab from "@/components/skills/AccuracyTestTab";
import ShootoutTestTab from "@/components/skills/ShootoutTestTab";
import { LogOut } from "lucide-react";

export default function SkillsStaff() {
  const navigate = useNavigate();
  const staff = getStaffSession();
  const [players, setPlayers] = useState<SkillsPlayer[]>([]);
  const [results, setResults] = useState<SkillsResult[]>([]);

  useEffect(() => {
    if (!staff) { navigate("/skills/login"); return; }
  }, []);

  const fetchData = useCallback(async () => {
    const [pRes, rRes] = await Promise.all([
      supabase.from('skills_players' as any).select('*').order('consecutive_number'),
      supabase.from('skills_results' as any).select('*'),
    ]);
    if (pRes.data) setPlayers(pRes.data as any);
    if (rRes.data) setResults(rRes.data as any);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = () => { clearStaffSession(); navigate("/skills/login"); };

  if (!staff) return null;

  const fieldShootoutOptions = [
    { key: 'goal', label: '⚽ Gol (+3)', points: 3 },
    { key: 'miss_outside', label: '↗ Afuera (-1)', points: -1 },
    { key: 'saved', label: '🧤 Atajado (+1)', points: 1 },
  ];

  const gkShootoutOptions = [
    { key: 'saved', label: '🧤 Atajado (+3)', points: 3 },
    { key: 'outside', label: '↗ Afuera (+1)', points: 1 },
    { key: 'goal_against', label: '⚽ Gol en contra (-1)', points: -1 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-secondary text-secondary-foreground">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-display text-lg font-bold uppercase">🏒 Skills Staff</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-secondary-foreground/70">{staff.user_name}</span>
            <Button size="sm" variant="ghost" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="container py-4">
        <Tabs defaultValue="players">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="players">Jugadores</TabsTrigger>
            <TabsTrigger value="test1">Test 1</TabsTrigger>
            <TabsTrigger value="test2">Test 2</TabsTrigger>
            <TabsTrigger value="test3">Test 3</TabsTrigger>
            <TabsTrigger value="test4">Test 4</TabsTrigger>
            <TabsTrigger value="test5">Test 5</TabsTrigger>
            <TabsTrigger value="test6">Test 6</TabsTrigger>
            <TabsTrigger value="test7">Test 7</TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <PlayersTab players={players} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="test1">
            <TimedTestTab testNumber={1} title="Test 1 — Fastest Lap Skater" players={players} results={results} onRefresh={fetchData} roleFilter="all" />
          </TabsContent>

          <TabsContent value="test2">
            <TimedTestTab testNumber={2} title="Test 2 — Fastest Circuit Skater" players={players} results={results} onRefresh={fetchData} roleFilter="all" />
          </TabsContent>

          <TabsContent value="test3">
            <SniperTestTab players={players} results={results} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="test4">
            <AccuracyTestTab players={players} results={results} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="test5">
            <ShootoutTestTab testNumber={5} title="Test 5 — Shootouts (Jugadores)" players={players} results={results} onRefresh={fetchData} roleFilter="field" options={fieldShootoutOptions} />
          </TabsContent>

          <TabsContent value="test6">
            <ShootoutTestTab testNumber={6} title="Test 6 — Shootouts (Arqueros)" players={players} results={results} onRefresh={fetchData} roleFilter="goalkeeper" options={gkShootoutOptions} />
          </TabsContent>

          <TabsContent value="test7">
            <TimedTestTab testNumber={7} title="Test 7 — Equipment Challenge (Arqueros)" players={players} results={results} onRefresh={fetchData} roleFilter="goalkeeper" maxAttempts={1} showMinutes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { TOURNAMENT_ID, IS_PRESEASON } from "@/lib/tournament";

const teamColorMap: Record<string, string> = {
  vikings: "bg-team-vikings",
  reapers: "bg-team-reapers",
  "grey-panthers": "bg-team-panthers",
  "rabbits-chiks": "bg-team-rabbits",
  aguilas: "bg-team-aguilas",
};

export default function Standings() {
  const { data: standings } = useQuery({
    queryKey: ["standings-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("standings_aggregate")
        .select("*, team:teams(*)")
        .eq("tournament_id", TOURNAMENT_ID)
        .order("rank", { ascending: true });
      return data || [];
    },
  });

  return (
    <div className="container py-8">
      <h1 className="font-display text-4xl font-bold uppercase mb-2">Tabla de Posiciones</h1>
      <p className="text-muted-foreground mb-6">Fase Regular • Copa Newbies II 2026</p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary text-secondary-foreground">
                <th className="p-3 text-left w-10">#</th>
                <th className="p-3 text-left">Equipo</th>
                <th className="p-3 text-center">PJ</th>
                <th className="p-3 text-center">W</th>
                <th className="p-3 text-center">E</th>
                <th className="p-3 text-center">L</th>
                <th className="p-3 text-center">GF</th>
                <th className="p-3 text-center">GC</th>
                <th className="p-3 text-center">DG</th>
                <th className="p-3 text-center font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings?.map((s: any, i: number) => (
                <tr key={s.team_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-bold">{i + 1}</td>
                  <td className="p-3">
                    <Link to={`/team/${s.team?.slug}`} className="flex items-center gap-2 hover:underline font-medium">
                      <div className={`w-3 h-3 rounded-full ${teamColorMap[s.team?.slug] || "bg-muted"}`} />
                      {s.team?.name}
                    </Link>
                  </td>
                  <td className="p-3 text-center">{IS_PRESEASON ? 0 : s.played}</td>
                  <td className="p-3 text-center">{IS_PRESEASON ? 0 : s.wins}</td>
                  <td className="p-3 text-center">{IS_PRESEASON ? 0 : s.draws}</td>
                  <td className="p-3 text-center">{IS_PRESEASON ? 0 : s.losses}</td>
                  <td className="p-3 text-center">{IS_PRESEASON ? 0 : s.gf}</td>
                  <td className="p-3 text-center">{IS_PRESEASON ? 0 : s.gc}</td>
                  <td className="p-3 text-center">{IS_PRESEASON ? 0 : (s.gd > 0 ? `+${s.gd}` : s.gd)}</td>
                  <td className="p-3 text-center font-display font-bold text-lg">{IS_PRESEASON ? 0 : s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-muted-foreground space-y-1">
        <p><strong>Desempates:</strong> 1) Pts → 2) Mayor W → 3) H2H DG → 4) H2H GC menor</p>
        <p>Victoria = 3 pts • Empate = 1 pt • Derrota = 0 pts</p>
        {IS_PRESEASON && (
          <p className="italic mt-2">* Estadísticas en cero — el torneo aún no ha comenzado.</p>
        )}
      </div>
    </div>
  );
}

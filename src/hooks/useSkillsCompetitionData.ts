import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SkillsPlayer, SkillsPointTable, SkillsResult } from "@/lib/skillsTypes";
import {
  DEFAULT_FIELD_RANKING_POINTS,
  DEFAULT_GOALKEEPER_RANKING_POINTS,
  extractSkillsPointScales,
  SkillsPointScales,
} from "@/lib/skillsRanking";

interface UseSkillsCompetitionDataOptions {
  activeOnly?: boolean;
}

export function useSkillsCompetitionData({ activeOnly = false }: UseSkillsCompetitionDataOptions = {}) {
  const [players, setPlayers] = useState<SkillsPlayer[]>([]);
  const [results, setResults] = useState<SkillsResult[]>([]);
  const [pointScales, setPointScales] = useState<SkillsPointScales>({
    field: DEFAULT_FIELD_RANKING_POINTS,
    goalkeeper: DEFAULT_GOALKEEPER_RANKING_POINTS,
  });

  const refresh = useCallback(async () => {
    let playersQuery = supabase.from("skills_players" as any).select("*").order("consecutive_number");
    if (activeOnly) playersQuery = playersQuery.eq("is_active", true);

    const [playersResponse, resultsResponse, pointTablesResponse] = await Promise.all([
      playersQuery,
      supabase.from("skills_results" as any).select("*"),
      supabase.from("skills_point_tables" as any).select("*"),
    ]);

    if (playersResponse.data) setPlayers(playersResponse.data as SkillsPlayer[]);
    if (resultsResponse.data) setResults(resultsResponse.data as SkillsResult[]);
    if (pointTablesResponse.data) {
      setPointScales(extractSkillsPointScales(pointTablesResponse.data as SkillsPointTable[]));
    }
  }, [activeOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabase
      .channel(`skills-live-${activeOnly ? "active" : "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "skills_results" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "skills_players" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "skills_point_tables" },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeOnly, refresh]);

  return { players, results, pointScales, refresh };
}

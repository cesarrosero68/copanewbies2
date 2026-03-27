import { SkillsPlayer, SkillsResult, SNIPER_POINTS } from "@/lib/skillsTypes";

export interface SkillsPointScales {
  field: number[];
  goalkeeper: number[];
}

export const DEFAULT_FIELD_RANKING_POINTS = [12, 10, 9, 8, 7, 6, 5, 4, 10, 8, 7, 6, 5, 4, 3, 8, 6, 5, 4, 3, 2, 1];
export const DEFAULT_GOALKEEPER_RANKING_POINTS = [10, 8];

interface SkillsPointTableRow {
  table_name: string;
  config: unknown;
}

const normalizePointsArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "number") return entry;
      if (
        typeof entry === "object" &&
        entry !== null &&
        "points" in entry &&
        typeof (entry as { points: unknown }).points === "number"
      ) {
        return (entry as { points: number }).points;
      }
      return Number.NaN;
    })
    .filter((entry): entry is number => Number.isFinite(entry));
};

export const extractSkillsPointScales = (tables: SkillsPointTableRow[] = []): SkillsPointScales => {
  const fieldTable = tables.find((table) => table.table_name === "field_ranking_group");
  const goalkeeperTable = tables.find((table) => table.table_name === "goalkeeper_ranking");

  const field = normalizePointsArray(fieldTable?.config);
  const goalkeeper = normalizePointsArray(goalkeeperTable?.config);

  return {
    field: field.length > 0 ? field : DEFAULT_FIELD_RANKING_POINTS,
    goalkeeper: goalkeeper.length > 0 ? goalkeeper : DEFAULT_GOALKEEPER_RANKING_POINTS,
  };
};

export const getPointsForPosition = (
  position: number | null | undefined,
  role: SkillsPlayer["role"],
  pointScales: SkillsPointScales,
) => {
  if (!position) return null;

  const scale = role === "goalkeeper" ? pointScales.goalkeeper : pointScales.field;
  return scale[position - 1] ?? 0;
};

export const buildPositionAndPointsMaps = (
  rankedPlayers: SkillsPlayer[],
  pointScales: SkillsPointScales,
) => {
  const rankMap: Record<string, number> = {};
  const ptsMap: Record<string, number> = {};

  rankedPlayers.forEach((player, index) => {
    const position = index + 1;
    rankMap[player.id] = position;
    ptsMap[player.id] = getPointsForPosition(position, player.role, pointScales) ?? 0;
  });

  return { rankMap, ptsMap };
};

export const getTimedResultMs = (result: SkillsResult) => {
  return (result.time_minutes || 0) * 60000 + (result.time_seconds || 0) * 1000 + (result.time_milliseconds || 0);
};

export const getBestTimedResultMs = (results: SkillsResult[]) => {
  if (results.length === 0) return null;
  return Math.min(...results.map(getTimedResultMs));
};

export const getDirectScoreFromResults = (results: SkillsResult[], testNumber: number) => {
  if (testNumber === 3) {
    return results.reduce((sum, result) => sum + (SNIPER_POINTS[result.sniper_target || ""] || 0), 0);
  }

  return results.reduce((sum, result) => sum + Number(result.score_direct || 0), 0);
};

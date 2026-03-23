export interface SkillsPlayer {
  id: string;
  consecutive_number: number;
  full_name: string;
  club: string;
  role: 'field' | 'goalkeeper';
  is_active: boolean;
  created_at: string;
}

export interface SkillsUser {
  user_id: string;
  user_name: string;
}

export interface SkillsResult {
  id: string;
  player_id: string;
  test_number: number;
  attempt_number: number | null;
  time_seconds: number | null;
  time_milliseconds: number | null;
  time_minutes: number | null;
  score_direct: number | null;
  sniper_target: string | null;
  shootout_result: string | null;
  entered_by: string | null;
  created_at: string;
}

export interface SkillsPointTable {
  id: string;
  table_name: string;
  config: any;
}

export const PENALTY_TYPES_SKILLS = [
  'top_left', 'top_right', 'bottom_left', 'bottom_right', 'center', 'miss'
] as const;

export const SNIPER_LABELS: Record<string, string> = {
  top_left: '↖ Sup-Izq (5)',
  top_right: '↗ Sup-Der (5)',
  bottom_left: '↙ Inf-Izq (2)',
  bottom_right: '↘ Inf-Der (2)',
  center: '🎯 Centro (8)',
  miss: '✕ Fallo (0)',
};

export const SNIPER_POINTS: Record<string, number> = {
  top_left: 5, top_right: 5, bottom_left: 2, bottom_right: 2, center: 8, miss: 0,
};

export const SHOOTOUT_FIELD_LABELS: Record<string, string> = {
  goal: '⚽ Gol (+3)',
  miss_outside: '↗ Afuera (-1)',
  saved: '🧤 Atajado (+1)',
};

export const SHOOTOUT_GK_LABELS: Record<string, string> = {
  saved: '🧤 Atajado (+3)',
  outside: '↗ Afuera (+1)',
  goal_against: '⚽ Gol en contra (-1)',
};

export function getStaffSession(): SkillsUser | null {
  const raw = localStorage.getItem('skills_staff');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setStaffSession(user: SkillsUser) {
  localStorage.setItem('skills_staff', JSON.stringify(user));
}

export function clearStaffSession() {
  localStorage.removeItem('skills_staff');
}

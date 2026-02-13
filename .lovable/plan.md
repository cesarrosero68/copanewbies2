

# Hockey Tournament App 🏒

## Overview
A full-stack hockey tournament web app with a team-branded public dashboard (ice blue/white palette with team identity) and a single-admin panel. Built on Lovable Cloud (Supabase) with webhook sync to Google Sheets via n8n.

---

## Phase 1: Database & Backend Foundation

### Database Schema
Create all core tables in Postgres via Lovable Cloud:
- **Tournament** – name, season, rules
- **Team** – name, slug, logo, linked to tournament
- **Player** – name, jersey number, position, linked to team
- **Match** – stage (REGULAR, P1A, P1B, SEMI, P2, FINAL, THIRD), home/away teams, scores, OT/SO fields, status (scheduled → live → final → locked)
- **GoalEvent** – match, team, period (1/2/3/OT), time, scorer, assist (optional)
- **StandingsAggregate** – pre-calculated standings per team
- **PlayerStatsAggregate** – pre-calculated goals, assists, points per player

### Edge Functions
- **recalculate-stats**: Triggered when a match is closed/locked. Recalculates standings (with full H2H tiebreaker logic for 2+ teams), player stats, and rankings
- **webhook-sync**: Fires an HTTP POST to a configurable n8n webhook URL with full payload (standings, leaders, match data) when a match is closed or locked
- **Admin authentication** with a single admin account using Supabase Auth

### Sample Data
Pre-populate all 26 matches (20 regular season round-robin + 6 playoff slots), 5 teams with rosters of 5-14 players each, and a handful of completed matches with goal events to demo the app

---

## Phase 2: Admin Panel (Login Required)

### Login Page
Simple email/password login for the single admin account

### Match Management
- View all matches in a list/calendar view with status badges
- **Schedule matches**: set date, time, venue, home/away teams
- **Record scores**: enter regular-time score for each team
- **Record goal events**: add goals with period (1/2/3/OT), time (mm:ss), scorer (dropdown from roster), and optional assist
- **Playoff OT/SO handling**: mark if OT was played, if shootout occurred, select winner — without altering regular-time score
- **Validation before closing**: ensure goal events sum matches the entered score
- **Close match** (status → final): triggers stats recalculation + webhook
- **Lock match**: prevents further edits; triggers webhook again

### Team & Player Management
- Edit team names and rosters
- Add/remove players

---

## Phase 3: Public Dashboard (No Login)

### Home Page
- Tournament branding with ice blue/white color scheme and team colors
- Upcoming matches carousel
- Latest results
- Standings snapshot (top 5)
- Top 10 leaders: scorers, assists, points (best player)

### Schedule & Results Page
- Full match list with filters by team, date range, and phase (regular/playoffs)
- Match cards showing score, and for playoffs: "Wins in OT" or "Wins in SO" labels without altering the regular-time score

### Standings Page
- Full table: PJ, W, E, L, GF, GC, DG, Pts
- Sorted with tiebreaker criteria clearly shown
- H2H mini-table displayed when teams are tied on points

### Match Detail Page
- Full scoreboard with period-by-period goal list (time, scorer, assist)
- Playoff matches show regular score + OT/SO result separately

### Team Page
- Roster with jersey numbers and positions
- Team schedule (upcoming + past results)
- Team stats summary

### Player Page
- Individual stats: goals, assists, total points
- Goal log with match details

### Playoffs Bracket Page
- Visual bracket showing the full playoff structure:
  - #1 → direct to Final
  - P1A (#2 vs #5), P1B (#3 vs #4)
  - Semifinal, Playoff 2, Final, 3rd/4th place
- Clickable matchups linking to match detail

---

## Phase 4: Google Sheets Sync (Webhook)

### Webhook Configuration
- Admin can set the n8n webhook URL in settings
- On match close or lock, POST to the webhook with:
  - Full standings array
  - Top scorers, assisters, best players, best goalie (GAA proxy)
  - Updated match data

### Expected Google Sheets Tabs (for n8n to populate)
- Programación, Estadísticas, Mejor Jugador, Mejor Asistente, Mejor Goleador, Mejor Arquero

---

## Design Theme
- **Primary palette**: Ice blue (#A8D8EA), white, dark navy accents
- **Team identity**: each team gets a subtle color accent in cards and headers
- **Typography**: Bold, sporty headings; clean body text
- **Responsive**: mobile-first for fans checking scores on their phones


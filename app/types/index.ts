// ─── Database / API Types ────────────────────────────────────────────────────

export interface Tournament {
  id: number
  name: string
  season: string
  year: number
  type: 'league' | 'copa' | 'recopa'
  status: 'active' | 'finished'
  champion: string | null
  top_scorer: string | null
  top_scorer_goals: number
  created_at: string | null
  finished_at: string | null
}

export interface TournamentPlayer {
  name: string
  disabled: number
  seed_position?: number
}

export interface MatchRow {
  match_key: string
  round: number
  stage: string | null
  home: string
  away: string
  home_goals: number | null
  away_goals: number | null
  played: number
  penalty_winner?: string | null
  home_penalties?: number | null
  away_penalties?: number | null
  tournament_id?: number
}

// ─── Frontend Types ──────────────────────────────────────────────────────────

export interface Match {
  id: string
  home: string
  away: string
  homeGoals: number | null
  awayGoals: number | null
  played: boolean
  stage?: string | null
  penaltyWinner?: string | null
  homePenalties?: number | null
  awayPenalties?: number | null
}

export interface Round {
  round: number
  matches: Match[]
}

export interface Standing {
  name: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  pts: number
}

export interface HistStats {
  [name: string]: {
    pj: number
    pg: number
    pe: number
    pp: number
    gf: number
    gc: number
  }
}

export interface CopaBracketMatch {
  id: string
  stage: string
  round: number
  home: string
  away: string
  homeGoals: number | null
  awayGoals: number | null
  played: boolean
  label?: string
  description?: string
  dependsOn?: string | string[]
  penaltyWinner?: string | null
  homePenalties?: number | null
  awayPenalties?: number | null
}

export interface CopaPlayer {
  name: string
  seed: number
}

export interface CopaData {
  tournament: Tournament
  players: CopaPlayer[]
  matches: CopaBracketMatch[]
  champion: string | null
  exists: boolean
}

export interface RecopaMatch {
  id: string
  stage: string
  home: string
  away: string
  homeGoals: number | null
  awayGoals: number | null
  played: boolean
  penaltyWinner: string | null
  homePenalties: number | null
  awayPenalties: number | null
}

export interface RecopaData {
  tournament: Tournament
  players: CopaPlayer[]
  match: RecopaMatch | null
  champion: string | null
  exists: boolean
}

export interface HeadToHeadMatch {
  tournament: string
  tournamentId: number
  tournamentType: string
  round: number
  stage: string | null
  p1Goals: number
  p2Goals: number
  p1IsHome: boolean
}

export interface HeadToHeadData {
  p1: string
  p2: string
  total: number
  p1Wins: number
  p2Wins: number
  draws: number
  p1Goals: number
  p2Goals: number
  matches: HeadToHeadMatch[]
}

export interface HallOfFameData {
  champions: (Tournament & { champion: string })[]
  titleCounts: { name: string; titles: number }[]
  allTimeScorers: { name: string; goals: number }[]
}

export interface HistoricalStatsData {
  historicalTable: (Standing & { tournaments: number })[]
  pointsByTournament: Record<string, number | string>[]
  titlesMap: Record<string, number>
  totalTournaments: number
}

export interface Quote {
  text: string
  author: string
}

export interface Odds {
  home: number
  draw: number
  away: number
}

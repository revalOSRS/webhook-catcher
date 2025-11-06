/**
 * Snapshot-related type definitions for clan and player statistics
 */

export interface ClanStatisticsSnapshot {
  id: number
  snapshot_date: Date
  group_id: number
  group_name: string
  total_members: number
  average_level: number
  average_xp: number
  maxed_count: number
  maxed_percentage: number
  total_clues: number
  total_boss_kills: number
  total_cox: number
  total_toa: number
  total_tob: number
  total_ehp: number
  total_ehb: number
  failed_members: number
  created_at: Date
}

export interface SnapshotFailedMember {
  id: number
  snapshot_id: number
  player_id: number
  player_username: string
  error_message: string | null
  created_at: Date
}

export interface PlayerSnapshot {
  id: number
  player_id: number
  username: string
  display_name: string | null
  snapshot_date: Date
  player_type: string | null
  player_build: string | null
  country: string | null
  status: string | null
  patron: boolean
  total_exp: number
  total_level: number
  combat_level: number
  ehp: number
  ehb: number
  ttm: number
  tt200m: number
  registered_at: Date | null
  updated_at: Date | null
  last_changed_at: Date | null
  last_imported_at: Date | null
  created_at: Date
  clan_snapshot_id: number | null
}

export interface PlayerSkillSnapshot {
  id: number
  player_snapshot_id: number
  skill: string
  experience: number
  level: number
  rank: number
  ehp: number
}

export interface PlayerBossSnapshot {
  id: number
  player_snapshot_id: number
  boss: string
  kills: number
  rank: number
  ehb: number
}

export interface PlayerActivitySnapshot {
  id: number
  player_snapshot_id: number
  activity: string
  score: number
  rank: number
}

export interface PlayerComputedSnapshot {
  id: number
  player_snapshot_id: number
  metric: string
  value: number
  rank: number
}


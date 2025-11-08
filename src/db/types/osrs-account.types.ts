/**
 * OSRS Account type definitions
 */

export interface OsrsAccount {
  id: number
  discord_id: string
  osrs_nickname: string
  dink_hash: string | null
  wom_player_id: number | null
  wom_rank: string | null
  ehp: number
  ehb: number
  is_primary: boolean
  last_synced_at: Date | null
  created_at: Date
  updated_at: Date
  
  // Achievement Diary counters (Migration 014)
  diary_easy_count?: number
  diary_medium_count?: number
  diary_hard_count?: number
  diary_elite_count?: number
  diary_total_count?: number
  
  // Quest counters (Migration 015)
  quest_points?: number
  quests_last_updated?: Date | null
  
  // Combat Achievement counters (Migration 016)
  ca_easy_count?: number
  ca_medium_count?: number
  ca_hard_count?: number
  ca_elite_count?: number
  ca_master_count?: number
  ca_grandmaster_count?: number
  ca_total_count?: number
  
  // Collection Log counters (Migration 017)
  clog_items_obtained?: number
  clog_total_items?: number
  clog_completion_percentage?: number
  
  // Event tracking (Migration 018)
  total_events?: number
  last_event_at?: Date | null
  
  // Points system (Migration 019)
  total_points?: number
  points_rank?: number | null
  points_last_updated?: Date | null
}




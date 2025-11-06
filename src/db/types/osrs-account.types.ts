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
}


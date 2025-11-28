/**
 * Bingo Event System Type Definitions
 * 
 * Types for the bingo event system including:
 * - Events, Teams, Team Members
 * - Bingo Tiles Library
 * - Bingo Boards and Board Tiles
 * - Tile Progress Tracking
 * - Buffs/Debuffs System
 * - Event Registrations
 */

// ===== Event Types =====

export type EventType = 
  | 'bingo'
  | 'battleship_bingo'
  | 'dungeoncrawler_bingo'
  | 'risk_bingo'
  | 'hide_and_seek'
  | 'puzzle'
  | 'reval_games'

export type EventStatus = 
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

export interface Event {
  id: string // UUID
  name: string
  description: string | null
  event_type: EventType
  status: EventStatus
  start_date: Date | null
  end_date: Date | null
  config: Record<string, any> // JSONB - event-specific configuration
  metadata: Record<string, any> // JSONB - additional metadata
  created_by: number | null // FK to members(id)
  created_at: Date
  updated_at: Date
}

// ===== Event Teams =====

export interface EventTeam {
  id: string // UUID
  event_id: string // UUID, FK to events(id)
  name: string
  color: string | null // Hex color code
  icon: string | null
  score: number
  metadata: Record<string, any> // JSONB
  created_at: Date
  updated_at: Date
}

export interface EventTeamMember {
  id: string // UUID
  team_id: string // UUID, FK to event_teams(id)
  member_id: number // FK to members(id)
  osrs_account_id: number | null // FK to osrs_accounts(id)
  role: string // e.g., 'captain', 'member'
  individual_score: number
  metadata: Record<string, any> // JSONB
  joined_at: Date
}

// ===== Event Registrations =====

export interface EventRegistration {
  id: string // UUID
  event_id: string // UUID, FK to events(id)
  member_id: number // FK to members(id)
  osrs_account_id: number | null // FK to osrs_accounts(id)
  status: string // e.g., 'pending', 'confirmed', 'cancelled'
  metadata: Record<string, any> // JSONB
  registered_at: Date
  registered_by: number | null // FK to members(id)
}

// ===== Bingo Tiles Library =====

export type TileDifficulty = 'easy' | 'medium' | 'hard' | 'extreme'

export interface BingoTile {
  id: string // VARCHAR(100) - unique identifier
  task: string
  category: string
  difficulty: TileDifficulty
  icon: string | null
  description: string | null
  base_points: number
  requirements: Record<string, any> // JSONB - tile requirements (see bingo-requirements.ts)
  bonus_tiers: Array<Record<string, any>> // JSONB - bonus tier definitions
  metadata: Record<string, any> // JSONB
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// ===== Bingo Boards =====

export interface BingoBoard {
  id: string // UUID
  event_id: string // UUID, FK to events(id)
  team_id: string // UUID, FK to event_teams(id) - added in migration 045
  name: string
  description: string | null
  columns: number // 1-20
  rows: number // 1-20
  show_row_column_buffs: boolean
  metadata: Record<string, any> // JSONB - includes show_tile_buffs setting
  created_at: Date
  updated_at: Date
}

export interface BingoBoardTile {
  id: string // UUID
  board_id: string // UUID, FK to bingo_boards(id)
  tile_id: string // VARCHAR(100), FK to bingo_tiles(id)
  position: string // e.g., "A1", "B2"
  custom_points: number | null // Override tile's base_points
  is_completed: boolean
  completed_by_team_id: string | null // UUID, FK to event_teams(id)
  completed_at: Date | null
  metadata: Record<string, any> // JSONB
  created_at: Date
  updated_at: Date
}

// ===== Tile Progress Tracking =====

export type CompletionType = 'auto' | 'manual_admin'

export interface BingoTileProgress {
  id: string // UUID
  board_tile_id: string // UUID, FK to bingo_board_tiles(id)
  osrs_account_id: number | null // FK to osrs_accounts(id) - nullable for team completions (migration 047)
  progress_value: number // NUMERIC(15, 2) - current progress value
  progress_metadata: Record<string, any> // JSONB - detailed progress data
  completion_type: CompletionType | null // Added in migration 047
  completed_at: Date | null // Added in migration 047
  completed_by_osrs_account_id: number | null // FK to osrs_accounts(id) - Added in migration 047
  completed_by_member_id: number | null // FK to members(id) - Added in migration 047
  recorded_at: Date
  created_at: Date
  updated_at: Date
}

// ===== Buffs/Debuffs System =====

export type BuffDebuffType = 'buff' | 'debuff'

export interface BingoBuffDebuff {
  id: string // VARCHAR(100) - unique identifier
  name: string
  description: string | null
  type: BuffDebuffType
  effect_type: string // e.g., 'points_multiplier', 'time_reduction'
  effect_value: number // NUMERIC(10, 2)
  icon: string | null
  metadata: Record<string, any> // JSONB
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface BingoBoardTileEffect {
  id: string // UUID
  board_tile_id: string // UUID, FK to bingo_board_tiles(id)
  buff_debuff_id: string // VARCHAR(100), FK to bingo_buffs_debuffs(id)
  applied_by: number | null // FK to members(id)
  is_active: boolean
  applied_at: Date
  expires_at: Date | null
  metadata: Record<string, any> // JSONB
}

export type LineType = 'row' | 'column'

export interface BingoBoardLineEffect {
  id: string // UUID
  board_id: string // UUID, FK to bingo_boards(id)
  line_type: LineType // 'row' or 'column'
  line_identifier: string // Row number (e.g., "1") or column letter (e.g., "A")
  buff_debuff_id: string // VARCHAR(100), FK to bingo_buffs_debuffs(id)
  applied_by: number | null // FK to members(id)
  is_active: boolean
  applied_at: Date
  expires_at: Date | null
  metadata: Record<string, any> // JSONB
}


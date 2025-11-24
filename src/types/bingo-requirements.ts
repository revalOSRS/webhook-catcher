/**
 * Type definitions for Bingo Tile Requirements System
 * Simplified requirement system for tracking tile completion
 */

// ============================================================================
// Base Types
// ============================================================================

export type MatchType = 'any' | 'all'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'

export type Category = 
  | 'slayer'
  | 'pvm'
  | 'raids'
  | 'collection'
  | 'clues'
  | 'skills'
  | 'quests'
  | 'diaries'
  | 'minigames'
  | 'combat'
  | 'pets'
  | 'agility'

// ============================================================================
// Simplified Requirement System
// ============================================================================

/**
 * Simplified requirement types for tile tracking
 */
export type SimplifiedRequirementType =
  | 'ITEM_DROP'
  | 'PET'
  | 'VALUE_DROP'
  | 'SPEEDRUN'

/**
 * Item Drop Requirement
 * Tracks when a specific item is dropped/obtained
 */
export interface ItemDropRequirement {
  type: 'ITEM_DROP'
  item_name: string
  item_id: number
  item_amount: number
}

/**
 * Pet Requirement
 * Tracks when a pet is obtained
 */
export interface PetRequirement {
  type: 'PET'
  pet_name: string
  amount: number
}

/**
 * Value Drop Requirement
 * Tracks total value of drops
 */
export interface ValueDropRequirement {
  type: 'VALUE_DROP'
  value: number
}

/**
 * Speedrun Requirement
 * Tracks speedrun completion time
 */
export interface SpeedrunRequirement {
  type: 'SPEEDRUN'
  location: string
  goal_seconds: number
}

/**
 * Union type for all simplified requirement types
 */
export type SimplifiedRequirement =
  | ItemDropRequirement
  | PetRequirement
  | ValueDropRequirement
  | SpeedrunRequirement

/**
 * Tiered Requirement Structure
 * Each tier represents a separate requirement level
 */
export interface TieredRequirement {
  tier: number // Tier number (1, 2, 3, etc.)
  requirement: SimplifiedRequirement
}

/**
 * Complete Requirement Structure
 * Supports ALL/ANY logic and tiered requirements
 */
export interface TileRequirements {
  match_type: 'all' | 'any' // Whether ALL or ANY requirement must be met
  requirements: SimplifiedRequirement[] // List of requirements (for non-tiered)
  tiers?: TieredRequirement[] // Optional tiered requirements (each tier is separate)
}

// ============================================================================
// Tile Definition
// ============================================================================

export interface BonusTier {
  threshold: string
  points: number
  requirementValue: number
}

export interface TileDefinition {
  id: string
  task: string
  description?: string
  category: Category
  difficulty: Difficulty
  icon: string
  requirements: TileRequirements
  base_points?: number
  bonus_tiers?: BonusTier[]
}

// ============================================================================
// Progress Tracking
// ============================================================================

export interface TileProgress {
  board_id: string
  tile_id: string
  position: string
  member_id: number
  progress_value: number
  metadata: {
    count?: number
    current_value?: number
    target_value?: number
    completed_at?: string
    tier?: number // Current tier if tiered requirement
    [key: string]: any
  }
}

export interface ProgressUpdate {
  progress: number
  count: number
  target: number
  completed: boolean
  metadata?: any
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

// ============================================================================
// Helper Types
// ============================================================================

export interface ActiveBoardTile {
  board_id: string
  tile_id: string
  position: string
  is_completed: boolean
  tile: {
    id: string
    task: string
    requirements: TileRequirements
    base_points: number
  }
}

export interface TileMatchResult {
  matched: boolean
  tiles?: Array<{
    tile: ActiveBoardTile['tile']
    progress: ProgressUpdate
  }>
  message?: string
}

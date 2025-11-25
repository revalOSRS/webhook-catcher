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
  | 'UNIQUE_COLLECTION'

/**
 * Item Drop Requirement
 * Tracks when a specific item is dropped/obtained
 * 
 * Supports two formats:
 * 1. Single item: { type: 'ITEM_DROP', item_name: '...', item_id: 123, item_amount: 5 }
 * 2. Multiple items (any of): { type: 'ITEM_DROP', items: [{ item_name: '...', item_id: 123 }, ...], total_amount: 2 }
 *    - Requires getting total_amount of ANY combination of the listed items
 *    - Example: items A, B, C, D, E with total_amount: 2 means get 2 of any combination (2A, or 1A+1B, etc.)
 */
export interface ItemDropRequirement {
  type: 'ITEM_DROP'
  // Single item format (backward compatible)
  item_name?: string
  item_id?: number
  item_amount?: number
  // Multiple items format (new)
  items?: Array<{
    item_name: string
    item_id: number
  }>
  total_amount?: number // Total count needed across any combination of items
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
 * Unique Collection Requirement
 * Tracks unique items with two collection modes:
 * 
 * 1. MULTI_SOURCE mode: Get unique items from different sources (e.g., unique drops from different bosses)
 *    - Base requirement: Get base_requirement unique items from ANY source
 *    - Tier 2: Get (base_requirement + tier_increment) unique items from a DIFFERENT source (not yet completed)
 *    - Tier 3: Get (base_requirement + 2*tier_increment) unique items from another DIFFERENT source
 *    - Example: Bosses A, B, C, D (each with 4 items)
 *      * Base: Get 1 item from any boss (any of Boss A's 4 items)
 *      * Tier 2: Get 2 items from a different boss (any 2 of Boss B's 4 items)
 *      * Tier 3: Get 3 items from another different boss (any 3 of Boss C's 4 items)
 *      * Tier 4: Get all 4 items from the last remaining boss (all 4 of Boss D's items)
 *    - Set allow_same_source_across_tiers: true to allow items from same source across tiers
 *      * Base: Get 1 item from any boss
 *      * Tier 2: Get 2 items from any boss (could be same or different)
 *      * Tier 3: Get 4 items from any boss (could be same or different)
 * 
 * 2. PROGRESSIVE mode: Get progressively more unique items from the same source/set
 *    - Base requirement: Get base_requirement unique items from the set
 *    - Tier 2: Get (base_requirement + tier_increment) unique items from the set
 *    - Tier 3: Get (base_requirement + 2*tier_increment) unique items, or ALL items if specified
 *    - Example: Moons of Peril set - Base gets 1, Tier 2 gets 2, Tier 3 gets all items
 */
export interface UniqueCollectionRequirement {
  type: 'UNIQUE_COLLECTION'
  collection_mode?: 'MULTI_SOURCE' | 'PROGRESSIVE' // Default: 'MULTI_SOURCE'
  sources: Array<{
    source_name: string // e.g., "Boss A", "Boss B", "Moons of Peril Set"
    source_id?: string | number // Optional identifier for the source
    items: Array<{
      item_name: string
      item_id: number
    }> // List of unique items from this source
  }>
  base_requirement?: number // Default: 1 (for MULTI_SOURCE: items per tier from one source, for PROGRESSIVE: starting count)
  tier_increment?: number // Default: 1 (for MULTI_SOURCE: increment per tier, for PROGRESSIVE: increment per tier)
  // Optional: Custom tier requirements (overrides base_requirement + tier_increment calculation)
  // Example: [1, 2, 4] means Tier 1 needs 1 item, Tier 2 needs 2 items, Tier 3 needs 4 items
  tier_requirements?: number[] // Array of item counts per tier (index 0 = Tier 1, index 1 = Tier 2, etc.)
  // For MULTI_SOURCE mode: if true, allows items from same source across tiers (default: false, requires different source per tier)
  allow_same_source_across_tiers?: boolean // Default: false
  // For PROGRESSIVE mode: if true, final tier requires ALL items from the set
  require_all_for_final_tier?: boolean // Default: false
  // For MULTI_SOURCE mode: if true, final tier requires ALL items from the final source
  require_all_for_final_source?: boolean // Default: false
}

/**
 * Union type for all simplified requirement types
 */
export type SimplifiedRequirement =
  | ItemDropRequirement
  | PetRequirement
  | ValueDropRequirement
  | SpeedrunRequirement
  | UniqueCollectionRequirement

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

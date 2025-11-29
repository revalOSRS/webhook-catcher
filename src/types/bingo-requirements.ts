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
  | 'EXPERIENCE'
  | 'BA_GAMBLES'

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
 * Tracks if any single item in a drop is worth >= the required value
 * (Not the total value of all items combined)
 */
export interface ValueDropRequirement {
  type: 'VALUE_DROP'
  value: number // Minimum value that a single item must be worth
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
 * Experience Requirement
 * Tracks experience gained in a specific skill
 */
export interface ExperienceRequirement {
  type: 'EXPERIENCE'
  skill: string // Skill name (e.g., "Attack", "Strength", "Magic", etc.)
  experience: number // Amount of experience required
}

/**
 * BA Gambles Requirement
 * Tracks Barbarian Assault gambles completed
 */
export interface BaGamblesRequirement {
  type: 'BA_GAMBLES'
  amount: number // Number of gambles required
}

/**
 * Unique Collection Requirement
 * Tracks unique items with two collection modes:
 * 
 * 1. MULTI_SOURCE mode: Get unique items from different sources (e.g., unique drops from different bosses)
 *    - Default behavior (allow_same_source_across_tiers: false):
 *      * Tier 1: Get base_requirement items from ANY source
 *      * Tier 2: Get base_requirement items from a DIFFERENT source (not yet completed)
 *      * Tier 3: Get base_requirement items from another DIFFERENT source
 *      * Each tier must use a different source than previous tiers
 *      * Example: 4 bosses, base_requirement: 1, tier_increment: 1
 *        - Tier 1: Get 1 item from any boss (e.g., Boss A)
 *        - Tier 2: Get 1 item from a different boss (e.g., Boss B)
 *        - Tier 3: Get 1 item from another different boss (e.g., Boss C)
 *        - Tier 4: Get 1 item from the last remaining boss (Boss D)
 *    - With tier_requirements: Override the item count per tier
 *      * Example: tier_requirements: [1, 1, 1, 1] means 1 item per tier from different bosses
 *    - With allow_same_source_across_tiers: true: Allows items from same source across tiers
 *      * Tier 1: Get base_requirement items from any boss
 *      * Tier 2: Get (base_requirement + tier_increment) items from any boss (could be same or different)
 *      * Tier 3: Get (base_requirement + 2*tier_increment) items from any boss (could be same or different)
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
  | ExperienceRequirement
  | BaGamblesRequirement

/**
 * Tiered Requirement Structure
 * Each tier represents a separate requirement level with its own points
 */
export interface TieredRequirement {
  tier: number // Tier number (1, 2, 3, etc.)
  requirement: SimplifiedRequirement
  points: number // Points awarded when this tier is completed
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

/**
 * Bonus Tier for awarding additional points
 * Used ONLY for value-based thresholds (e.g., "get 10 items", "get 100k xp")
 * For tiered requirements, use points directly in TieredRequirement instead
 * 
 * Example: { threshold: "10_items", requirementValue: 10, points: 5 }
 * This awards 5 points when the progress value reaches 10
 */
export interface BonusTier {
  threshold: string // e.g., "10_items", "100k_xp"
  requirementValue: number // The value needed to achieve this tier
  points: number // Points awarded for this tier
}

export interface TileDefinition {
  id: string
  task: string
  description?: string
  category: Category
  difficulty: Difficulty
  icon: string
  requirements: TileRequirements
  base_points?: number // Base points for completing the base requirement (if no tiers)
  // bonus_tiers is ONLY for value-based thresholds (e.g., "get 10 items")
  // For tiered requirements, use points directly in requirements.tiers[].points
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

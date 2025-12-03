/**
 * Bingo Tile Requirement Types
 * Types for tile requirement definitions, matching, and progress tracking
 */

import { 
  BingoTileRequirementType, 
  BingoTileMatchType,
  type BingoTileRequirementDef,
  type TieredRequirementDef,
  type BingoTileRequirements,
  type ItemDropRequirementDef,
  type PetRequirementDef,
  type ValueDropRequirementDef,
  type SpeedrunRequirementDef,
  type ExperienceRequirementDef,
  type BaGamblesRequirementDef,
  type ChatRequirementDef,
  type PuzzleRequirementDef,
  type HiddenRequirementDef,
  ALLOWED_CHAT_SOURCES,
  type AllowedChatSource
} from '../entities/bingo-tiles.entity.js';

// Re-export everything for convenience
export { 
  BingoTileRequirementType, 
  BingoTileMatchType,
  BingoTileRequirements,
  BingoTileRequirementDef,
  TieredRequirementDef,
  ALLOWED_CHAT_SOURCES
};

// Type aliases for backwards compatibility
export type SimplifiedBingoTileRequirement = BingoTileRequirementDef;
export type TieredBingoTileRequirement = TieredRequirementDef;
export type ItemDropRequirement = ItemDropRequirementDef;
export type PetRequirement = PetRequirementDef;
export type ValueDropRequirement = ValueDropRequirementDef;
export type SpeedrunRequirement = SpeedrunRequirementDef;
export type ExperienceRequirement = ExperienceRequirementDef;
export type BaGamblesRequirement = BaGamblesRequirementDef;
export type ChatRequirement = ChatRequirementDef;
export type PuzzleRequirement = PuzzleRequirementDef;
export type HiddenRequirement = HiddenRequirementDef;
export type { AllowedChatSource };

// ============================================================================
// PROGRESS METADATA TYPES (tracking individual player contributions)
// ============================================================================

/**
 * Base player contribution - common fields for all requirement types
 */
interface BasePlayerContribution {
  osrsAccountId: number;
  osrsNickname: string;
  memberId?: number;
}

/**
 * Tier completion tracking
 */
export interface TierCompletion {
  tier: number;
  completedAt: string;
  completedByOsrsAccountId: number;
}

/**
 * Progress tracking for a single requirement (for multi-requirement tiles)
 */
export interface RequirementProgressEntry {
  isCompleted: boolean;
  progressValue: number;
  progressMetadata: unknown;
}

/**
 * Base metadata fields shared across all requirement types
 */
interface BaseProgressMetadata {
  requirementType: BingoTileRequirementType;
  targetValue: number;
  lastUpdateAt: string;
  /** Completed tiers with their completion dates */
  completedTiers?: TierCompletion[];
  /** Highest completed tier number */
  currentTier?: number;
  /** For matchType "all" - indices of requirements that are complete */
  completedRequirementIndices?: number[];
  /** Progress state for each requirement (keyed by index) */
  requirementProgress?: Record<number, RequirementProgressEntry>;
  /** Total number of requirements in the tile */
  totalRequirements?: number;
}

// ============================================================================
// SPEEDRUN METADATA
// ============================================================================

/**
 * Individual speedrun attempt
 */
interface SpeedrunAttempt {
  timeSeconds: number;
  timestamp: string;
  isPersonalBest: boolean;
}

/**
 * Player contribution for speedrun requirements
 */
export interface SpeedrunPlayerContribution extends BasePlayerContribution {
  bestTimeSeconds: number;
  attempts: SpeedrunAttempt[];
}

/**
 * Progress metadata for SPEEDRUN requirements
 * Tracks best times (lower is better)
 */
export interface SpeedrunProgressMetadata extends BaseProgressMetadata {
  requirementType: BingoTileRequirementType.SPEEDRUN;
  /** Current team best time in seconds */
  currentBestTimeSeconds: number;
  /** Goal time in seconds */
  goalSeconds: number;
  /** Each player's best attempts */
  playerContributions: SpeedrunPlayerContribution[];
}

// ============================================================================
// ITEM DROP METADATA
// ============================================================================

/**
 * Item tracked for a player
 */
interface TrackedItem {
  itemId: number;
  itemName: string;
  quantity: number;
}

/**
 * Player contribution for item drop requirements
 */
export interface ItemDropPlayerContribution extends BasePlayerContribution {
  items: TrackedItem[];
  totalCount: number;
}

/**
 * Progress metadata for ITEM_DROP requirements
 * Tracks item counts per player
 */
export interface ItemDropProgressMetadata extends BaseProgressMetadata {
  requirementType: BingoTileRequirementType.ITEM_DROP;
  /** Current team total count */
  currentTotalCount: number;
  /** Each player's item drops */
  playerContributions: ItemDropPlayerContribution[];
  /** Last items obtained (for display) */
  lastItemsObtained?: TrackedItem[];
}

// ============================================================================
// VALUE DROP METADATA
// ============================================================================

/**
 * Qualifying drop for value requirements
 */
interface QualifyingDrop {
  itemId: number;
  itemName: string;
  value: number;
  timestamp: string;
}

/**
 * Player contribution for value drop requirements
 */
export interface ValueDropPlayerContribution extends BasePlayerContribution {
  bestValue: number;
  qualifyingDrops: QualifyingDrop[];
}

/**
 * Progress metadata for VALUE_DROP requirements
 * Tracks highest single-item values (must be single item, not cumulative)
 */
export interface ValueDropProgressMetadata extends BaseProgressMetadata {
  requirementType: BingoTileRequirementType.VALUE_DROP;
  /** Current team best single-item value */
  currentBestValue: number;
  /** Each player's best drops */
  playerContributions: ValueDropPlayerContribution[];
}

// ============================================================================
// PET METADATA
// ============================================================================

/**
 * Pet drop record
 */
interface PetDrop {
  petName: string;
  timestamp: string;
}

/**
 * Player contribution for pet requirements
 */
export interface PetPlayerContribution extends BasePlayerContribution {
  pets: PetDrop[];
  count: number;
}

/**
 * Progress metadata for PET requirements
 * Tracks pet drops per player
 */
export interface PetProgressMetadata extends BaseProgressMetadata {
  requirementType: BingoTileRequirementType.PET;
  /** Current team total pet count */
  currentTotalCount: number;
  /** Each player's pet drops */
  playerContributions: PetPlayerContribution[];
}

// ============================================================================
// EXPERIENCE METADATA
// ============================================================================

/**
 * Player contribution for experience requirements
 */
export interface ExperiencePlayerContribution extends BasePlayerContribution {
  baselineXp: number;
  currentXp: number;
  xpContribution: number;
}

/**
 * Progress metadata for EXPERIENCE requirements
 * Tracks XP gained since event start
 */
export interface ExperienceProgressMetadata extends BaseProgressMetadata {
  requirementType: BingoTileRequirementType.EXPERIENCE;
  /** Skill being tracked */
  skill: string;
  /** Current team total XP gained */
  currentTotalXp: number;
  /** Target XP to complete */
  targetXp: number;
  /** Each player's XP contribution */
  playerContributions: ExperiencePlayerContribution[];
}

// ============================================================================
// BA GAMBLES METADATA
// ============================================================================

/**
 * Gamble session record
 */
interface GambleSession {
  count: number;
  timestamp: string;
}

/**
 * Player contribution for BA gambles requirements
 */
export interface BaGamblesPlayerContribution extends BasePlayerContribution {
  gambleContribution: number;
  gambleSessions: GambleSession[];
}

/**
 * Progress metadata for BA_GAMBLES requirements
 * Tracks gamble counts per player
 */
export interface BaGamblesProgressMetadata extends BaseProgressMetadata {
  requirementType: BingoTileRequirementType.BA_GAMBLES;
  /** Current team total gambles */
  currentTotalGambles: number;
  /** Each player's gamble contributions */
  playerContributions: BaGamblesPlayerContribution[];
}

// ============================================================================
// CHAT METADATA
// ============================================================================

/**
 * Chat message record
 */
interface ChatMessageRecord {
  message: string;
  messageType: string;
  timestamp: string;
}

/**
 * Player contribution for chat requirements
 */
export interface ChatPlayerContribution extends BasePlayerContribution {
  messages: ChatMessageRecord[];
  count: number;
}

/**
 * Progress metadata for CHAT requirements
 * Tracks matching chat messages per player
 */
export interface ChatProgressMetadata extends BaseProgressMetadata {
  requirementType: BingoTileRequirementType.CHAT;
  /** Target number of messages required */
  targetCount: number;
  /** Current team total matching messages */
  currentTotalCount: number;
  /** Each player's matching messages */
  playerContributions: ChatPlayerContribution[];
}

// ============================================================================
// PUZZLE METADATA
// ============================================================================

/**
 * Progress metadata for PUZZLE requirements
 * Wraps the hidden requirement's metadata and adds puzzle-specific tracking
 */
export interface PuzzleProgressMetadata extends BaseProgressMetadata {
  requirementType: BingoTileRequirementType.PUZZLE;
  /** The type of the hidden requirement being tracked */
  hiddenRequirementType: BingoTileRequirementType;
  /** The actual progress metadata from the hidden requirement */
  hiddenProgressMetadata: Exclude<ProgressMetadata, PuzzleProgressMetadata>;
  /** Whether the puzzle has been solved (hidden requirement completed) */
  isSolved: boolean;
  /** Timestamp when the puzzle was solved */
  solvedAt?: string;
  /** The puzzle category (for display/filtering) */
  puzzleCategory?: string;
}

// ============================================================================
// UNION TYPE FOR ALL PROGRESS METADATA
// ============================================================================

/**
 * Union type for all progress metadata types.
 * Use the `requirementType` discriminator to narrow the type.
 */
export type ProgressMetadata =
  | SpeedrunProgressMetadata
  | ItemDropProgressMetadata
  | ValueDropProgressMetadata
  | PetProgressMetadata
  | ExperienceProgressMetadata
  | BaGamblesProgressMetadata
  | ChatProgressMetadata
  | PuzzleProgressMetadata;

// ============================================================================
// CALCULATOR TYPES (for progress calculation functions)
// ============================================================================

/**
 * Result of a progress calculation.
 * Returned by all calculator functions.
 */
export interface ProgressResult {
  /** Current progress value (count, XP, time in seconds, etc.) */
  progressValue: number;
  /** Typed metadata to store with the progress record */
  progressMetadata: ProgressMetadata;
  /** Whether the requirement is now complete */
  isCompleted: boolean;
  /** Tier completions (for tiered requirements) */
  completedTiers?: TierCompletion[];
}

/**
 * Existing progress state passed to calculators.
 * Retrieved from the database before calculation.
 */
export interface ExistingProgress {
  progressValue: number;
  progressMetadata: ProgressMetadata;
}

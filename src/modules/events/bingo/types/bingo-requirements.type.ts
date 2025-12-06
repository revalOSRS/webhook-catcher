/**
 * Bingo Tile Requirement Types
 * 
 * This file contains all type definitions for:
 * 1. Requirement definitions (what a tile requires)
 * 2. Progress metadata (tracking progress toward completion)
 * 3. Player contributions (who contributed what)
 * 
 * STRUCTURE:
 * - RequirementProgressData: Progress for a SINGLE requirement (what calculators produce)
 * - TileProgressMetadata: Tile-level wrapper stored in DB (contains requirementProgress map)
 * 
 * The database stores TileProgressMetadata:
 * {
 *   totalRequirements: 3,
 *   completedRequirementIndices: [0, 1],
 *   requirementProgress: {
 *     "0": { isCompleted: true, progressValue: 1, progressMetadata: {...} },
 *     "1": { isCompleted: true, progressValue: 1, progressMetadata: {...} },
 *     "2": { isCompleted: false, progressValue: 0, progressMetadata: {...} }
 *   }
 * }
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

// =============================================================================
// RE-EXPORTS (for convenience)
// =============================================================================

export { 
  BingoTileRequirementType, 
  BingoTileMatchType,
  BingoTileRequirements,
  BingoTileRequirementDef,
  TieredRequirementDef,
  ALLOWED_CHAT_SOURCES
};

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

// =============================================================================
// COMMON TYPES
// =============================================================================

/** Tracked item for drops */
export interface TrackedItem {
  itemId: number;
  itemName: string;
  quantity: number;
}

/** Tier completion record */
export interface TierCompletion {
  tier: number;
  completedAt: string;
  completedByOsrsAccountId: number;
}

/** Base fields for all player contributions */
export interface BasePlayerContribution {
  osrsAccountId: number;
  osrsNickname: string;
  memberId?: number;
}

// =============================================================================
// REQUIREMENT-LEVEL PROGRESS (what calculators produce)
// =============================================================================

/**
 * Base fields for requirement-level progress.
 * This is what calculators produce for a SINGLE requirement.
 */
interface BaseRequirementProgress {
  requirementType: BingoTileRequirementType;
  targetValue: number;
  lastUpdateAt: string;
  /** For tiered requirements only */
  completedTiers?: TierCompletion[];
  currentTier?: number;
}

// --- Speedrun ---
export interface SpeedrunAttempt {
  timeSeconds: number;
  timestamp: string;
  osrsAccountId: number;
  osrsNickname: string;
}

export interface SpeedrunPlayerContribution extends BasePlayerContribution {
  bestTimeSeconds: number;
  attempts: SpeedrunAttempt[];
}

export interface SpeedrunProgressMetadata extends BaseRequirementProgress {
  requirementType: BingoTileRequirementType.SPEEDRUN;
  currentBestTimeSeconds: number;
  goalSeconds: number;
  playerContributions: SpeedrunPlayerContribution[];
}

// --- Item Drop ---
export interface ItemDropPlayerContribution extends BasePlayerContribution {
  items: TrackedItem[];
  totalCount: number;
}

export interface ItemDropProgressMetadata extends BaseRequirementProgress {
  requirementType: BingoTileRequirementType.ITEM_DROP;
  currentTotalCount: number;
  playerContributions: ItemDropPlayerContribution[];
  lastItemsObtained?: TrackedItem[];
}

// --- Value Drop ---
export interface QualifyingDrop {
  itemId: number;
  itemName: string;
  value: number;
  timestamp: string;
}

export interface ValueDropPlayerContribution extends BasePlayerContribution {
  bestValue: number;
  qualifyingDrops: QualifyingDrop[];
}

export interface ValueDropProgressMetadata extends BaseRequirementProgress {
  requirementType: BingoTileRequirementType.VALUE_DROP;
  currentBestValue: number;
  playerContributions: ValueDropPlayerContribution[];
}

// --- Pet ---
export interface PetDrop {
  petName: string;
  timestamp: string;
}

export interface PetPlayerContribution extends BasePlayerContribution {
  pets: PetDrop[];
  count: number;
}

export interface PetProgressMetadata extends BaseRequirementProgress {
  requirementType: BingoTileRequirementType.PET;
  currentTotalCount: number;
  playerContributions: PetPlayerContribution[];
}

// --- Experience ---
export interface ExperiencePlayerContribution extends BasePlayerContribution {
  baselineXp: number;
  currentXp: number;
  xpContribution: number;
}

export interface ExperienceProgressMetadata extends BaseRequirementProgress {
  requirementType: BingoTileRequirementType.EXPERIENCE;
  skill: string;
  targetXp: number;
  currentTotalXp: number;
  playerContributions: ExperiencePlayerContribution[];
}

// --- BA Gambles ---
export interface GambleSession {
  count: number;
  timestamp: string;
}

export interface BaGamblesPlayerContribution extends BasePlayerContribution {
  gambleContribution: number;
  gambleSessions: GambleSession[];
}

export interface BaGamblesProgressMetadata extends BaseRequirementProgress {
  requirementType: BingoTileRequirementType.BA_GAMBLES;
  currentTotalGambles: number;
  playerContributions: BaGamblesPlayerContribution[];
}

// --- Chat ---
export interface ChatMessageRecord {
  message: string;
  messageType: string;
  timestamp: string;
}

export interface ChatPlayerContribution extends BasePlayerContribution {
  messages: ChatMessageRecord[];
  count: number;
}

export interface ChatProgressMetadata extends BaseRequirementProgress {
  requirementType: BingoTileRequirementType.CHAT;
  targetCount: number;
  currentTotalCount: number;
  playerContributions: ChatPlayerContribution[];
}

// --- Puzzle ---
export interface PuzzleProgressMetadata extends BaseRequirementProgress {
  requirementType: BingoTileRequirementType.PUZZLE;
  hiddenRequirementType: BingoTileRequirementType;
  hiddenProgressMetadata: RequirementProgressData;
  isSolved: boolean;
  solvedAt?: string;
  puzzleCategory?: string;
}

/**
 * Union of all requirement-level progress types.
 * This is what calculators return for a single requirement.
 */
export type RequirementProgressData =
  | SpeedrunProgressMetadata
  | ItemDropProgressMetadata
  | ValueDropProgressMetadata
  | PetProgressMetadata
  | ExperienceProgressMetadata
  | BaGamblesProgressMetadata
  | ChatProgressMetadata
  | PuzzleProgressMetadata;

// =============================================================================
// TILE-LEVEL PROGRESS (what's stored in database)
// =============================================================================

/**
 * Entry for a single requirement's progress within a tile.
 */
export interface RequirementProgressEntry {
  isCompleted: boolean;
  progressValue: number;
  progressMetadata: RequirementProgressData;
}

/**
 * Tile-level progress metadata stored in the database.
 * 
 * All progress goes through requirementProgress - no duplicate outer fields.
 * Even single-requirement tiles use requirementProgress["0"].
 */
export interface TileProgressMetadata {
  /** Total number of requirements in the tile (always >= 1) */
  totalRequirements: number;
  /** Indices of completed requirements (empty array if none) */
  completedRequirementIndices: number[];
  /** Progress for each requirement, keyed by index ("0", "1", etc.) */
  requirementProgress: Record<string, RequirementProgressEntry>;
}

/**
 * Union of all player contribution types.
 */
export type PlayerContribution =
  | SpeedrunPlayerContribution
  | ItemDropPlayerContribution
  | ValueDropPlayerContribution
  | PetPlayerContribution
  | ExperiencePlayerContribution
  | BaGamblesPlayerContribution
  | ChatPlayerContribution;

// =============================================================================
// CALCULATOR TYPES
// =============================================================================

/**
 * Result returned by progress calculators.
 * Contains requirement-level data (NOT tile-level wrapper fields).
 */
export interface ProgressResult {
  progressValue: number;
  /** Requirement-level progress data */
  progressMetadata: RequirementProgressData;
  isCompleted: boolean;
  completedTiers?: TierCompletion[];
  /** Tile-level metadata (set by tile-progress.service before saving) */
  tileProgressMetadata?: TileProgressMetadata;
}

/**
 * Existing progress passed to calculators.
 * Contains requirement-level metadata (extracted from TileProgressMetadata by tile-progress.service).
 */
export interface ExistingProgress {
  progressValue: number;
  progressMetadata: RequirementProgressData;
}

/**
 * Helper to get progress for a specific requirement index.
 */
export function getRequirementProgress(
  metadata: TileProgressMetadata | undefined,
  index: number
): RequirementProgressEntry | undefined {
  return metadata?.requirementProgress?.[String(index)];
}

/**
 * Helper to create empty tile progress metadata.
 */
export function createEmptyTileProgress(totalRequirements: number = 1): TileProgressMetadata {
  return {
    totalRequirements,
    completedRequirementIndices: [],
    requirementProgress: {}
  };
}

/**
 * Helper to get completedTiers from tile metadata.
 * Tiers are stored on the first requirement (index 0) for tiered tiles.
 */
export function getCompletedTiers(metadata: TileProgressMetadata | undefined): TierCompletion[] {
  const reqProgress = getRequirementProgress(metadata, 0);
  return reqProgress?.progressMetadata?.completedTiers ?? [];
}

/**
 * Helper to get currentTier from tile metadata.
 */
export function getCurrentTier(metadata: TileProgressMetadata | undefined): number | undefined {
  const reqProgress = getRequirementProgress(metadata, 0);
  return reqProgress?.progressMetadata?.currentTier;
}


/**
 * Type guard to check if metadata is tile progress.
 */
export function isTileProgressMetadata(metadata: unknown): metadata is TileProgressMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'requirementProgress' in metadata &&
    'totalRequirements' in metadata
  );
}

/**
 * Type guard to check if metadata is requirement progress.
 */
export function isRequirementProgressData(metadata: unknown): metadata is RequirementProgressData {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'requirementType' in metadata
  );
}

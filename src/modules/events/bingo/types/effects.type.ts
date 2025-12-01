/**
 * Bingo Effect Types
 * 
 * Comprehensive type definitions for the bingo effects system.
 * Effects can be earned by completing rows, columns, or specific tiles.
 * They can affect your own team or be used against other teams.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Category of effect - determines UI grouping and some behaviors
 */
export enum EffectCategory {
  /** Point bonuses and multipliers */
  POINTS = 'points',
  /** Tile swaps, locks, board modifications */
  BOARD_MANIPULATION = 'board_manipulation',
  /** Shields, reflects, negation */
  DEFENSE = 'defense',
  /** Effects targeting other teams */
  OFFENSE = 'offense',
  /** Always-active passive effects */
  PASSIVE = 'passive'
}

/**
 * Who the effect targets when used
 */
export enum EffectTarget {
  /** Affects own team's board/score */
  SELF = 'self',
  /** Must select an enemy team to target */
  ENEMY = 'enemy',
  /** Affects all teams in the event */
  ALL = 'all'
}

/**
 * When/how the effect is activated
 */
export enum EffectTrigger {
  /** Applies immediately when earned (e.g., point bonus) */
  IMMEDIATE = 'immediate',
  /** Team chooses when to use (goes into "hand") */
  MANUAL = 'manual',
  /** Auto-triggers in response to incoming effects */
  REACTIVE = 'reactive'
}

/**
 * Source of how an effect was earned
 */
export enum EffectSource {
  /** Earned by completing all tiles in a row */
  ROW_COMPLETION = 'row_completion',
  /** Earned by completing all tiles in a column */
  COLUMN_COMPLETION = 'column_completion',
  /** Earned by completing a specific tile */
  TILE_COMPLETION = 'tile_completion',
  /** Granted by an administrator */
  ADMIN = 'admin',
  /** Reflected from another team's attack */
  REFLECTED = 'reflected'
}

/**
 * Status of an earned effect
 */
export enum EarnedEffectStatus {
  /** Available to be used */
  AVAILABLE = 'available',
  /** Has been used */
  USED = 'used',
  /** Expired (if time-limited) */
  EXPIRED = 'expired',
  /** Was negated/blocked before use */
  NEGATED = 'negated'
}

/**
 * Specific effect types - the actual behavior
 */
export enum EffectType {
  // === POINTS ===
  /** Add flat points to team score */
  POINT_BONUS = 'point_bonus',
  /** Multiply points for next N tile completions */
  POINT_MULTIPLIER = 'point_multiplier',
  /** Extra points per line completed while active */
  LINE_COMPLETION_BONUS = 'line_completion_bonus',
  
  // === BOARD MANIPULATION (SELF) ===
  /** Swap positions of 2 tiles on own board */
  TILE_SWAP_SELF = 'tile_swap_self',
  /** Mark a tile as complete without requirements */
  TILE_AUTO_COMPLETE = 'tile_auto_complete',
  /** Copy progress from one tile to another */
  TILE_PROGRESS_COPY = 'tile_progress_copy',
  
  // === BOARD MANIPULATION (ENEMY) ===
  /** Swap positions of 2 tiles on enemy board */
  TILE_SWAP_ENEMY = 'tile_swap_enemy',
  /** Lock a tile on enemy board (prevent completion) */
  TILE_LOCK = 'tile_lock',
  /** Reset progress on enemy tile */
  TILE_PROGRESS_RESET = 'tile_progress_reset',
  /** Steal progress from enemy tile */
  PROGRESS_STEAL = 'progress_steal',
  
  // === DEFENSE ===
  /** Block/absorb the next incoming negative effect */
  SHIELD = 'shield',
  /** Reflect the next incoming negative effect back to sender */
  UNO_REVERSE = 'uno_reverse',
  /** Immune to all effects for a duration */
  EFFECT_IMMUNITY = 'effect_immunity',
  /** Cancel a specific effect type */
  EFFECT_NEGATE = 'effect_negate',
  
  // === UTILITY ===
  /** Unlock a locked tile */
  TILE_UNLOCK = 'tile_unlock',
  /** Reveal enemy team's board progress */
  REVEAL_PROGRESS = 'reveal_progress'
}

// ============================================================================
// EFFECT CONFIG TYPES (Discriminated Union)
// ============================================================================

/**
 * Base config shared by all effect types
 */
interface BaseEffectConfig {
  type: EffectType;
  /** Priority for effect resolution (higher = resolves first) */
  priority?: number;
  /** Animation/sound key when activated */
  animation?: string;
}

/**
 * Config for POINT_BONUS effect
 * Adds flat points to team score immediately
 */
export interface PointBonusConfig extends BaseEffectConfig {
  type: EffectType.POINT_BONUS;
  /** Points to add */
  points: number;
}

/**
 * Config for POINT_MULTIPLIER effect
 * Multiplies points for next N tile completions
 */
export interface PointMultiplierConfig extends BaseEffectConfig {
  type: EffectType.POINT_MULTIPLIER;
  /** Multiplier value (e.g., 2 for double, 1.5 for 50% bonus) */
  multiplier: number;
  /** Number of tile completions this applies to */
  completionsAffected: number;
}

/**
 * Config for LINE_COMPLETION_BONUS effect
 * Extra points per line completed while active
 */
export interface LineCompletionBonusConfig extends BaseEffectConfig {
  type: EffectType.LINE_COMPLETION_BONUS;
  /** Bonus points per line */
  bonusPerLine: number;
}

/**
 * Config for TILE_SWAP_SELF effect
 * Swap positions of tiles on own board
 */
export interface TileSwapSelfConfig extends BaseEffectConfig {
  type: EffectType.TILE_SWAP_SELF;
  /** Number of tiles that can be swapped (usually 2) */
  tilesCount: number;
}

/**
 * Config for TILE_SWAP_ENEMY effect
 * Swap positions of tiles on enemy board
 */
export interface TileSwapEnemyConfig extends BaseEffectConfig {
  type: EffectType.TILE_SWAP_ENEMY;
  /** Number of tiles that can be swapped */
  tilesCount: number;
}

/**
 * Config for TILE_AUTO_COMPLETE effect
 * Mark a tile as complete without meeting requirements
 */
export interface TileAutoCompleteConfig extends BaseEffectConfig {
  type: EffectType.TILE_AUTO_COMPLETE;
  /** Number of tiles that can be auto-completed */
  tilesCount: number;
}

/**
 * Config for TILE_PROGRESS_COPY effect
 * Copy progress from one tile to another
 */
export interface TileProgressCopyConfig extends BaseEffectConfig {
  type: EffectType.TILE_PROGRESS_COPY;
  /** Percentage of progress to copy (0-100) */
  copyPercentage: number;
}

/**
 * Config for TILE_LOCK effect
 * Lock a tile on enemy board (prevent completion)
 */
export interface TileLockConfig extends BaseEffectConfig {
  type: EffectType.TILE_LOCK;
  /** Duration in seconds the lock lasts */
  durationSeconds: number;
}

/**
 * Config for TILE_PROGRESS_RESET effect
 * Reset progress on enemy tile
 */
export interface TileProgressResetConfig extends BaseEffectConfig {
  type: EffectType.TILE_PROGRESS_RESET;
  /** Percentage of progress to reset (0-100, 100 = full reset) */
  resetPercentage: number;
}

/**
 * Config for PROGRESS_STEAL effect
 * Steal progress from enemy tile to your own
 */
export interface ProgressStealConfig extends BaseEffectConfig {
  type: EffectType.PROGRESS_STEAL;
  /** Percentage of progress to steal */
  stealPercentage: number;
}

/**
 * Config for SHIELD effect
 * Block incoming negative effects
 */
export interface ShieldConfig extends BaseEffectConfig {
  type: EffectType.SHIELD;
  /** Number of attacks this shield can block */
  charges: number;
}

/**
 * Config for UNO_REVERSE effect
 * Reflect the next incoming negative effect back to sender
 */
export interface UnoReverseConfig extends BaseEffectConfig {
  type: EffectType.UNO_REVERSE;
  /** Number of effects that can be reflected */
  charges: number;
}

/**
 * Config for EFFECT_IMMUNITY effect
 * Immune to all effects for a duration
 */
export interface EffectImmunityConfig extends BaseEffectConfig {
  type: EffectType.EFFECT_IMMUNITY;
  /** Duration of immunity in seconds */
  durationSeconds: number;
}

/**
 * Config for EFFECT_NEGATE effect
 * Cancel a specific effect type
 */
export interface EffectNegateConfig extends BaseEffectConfig {
  type: EffectType.EFFECT_NEGATE;
  /** Specific effect types that can be negated (empty = any) */
  negatableTypes?: EffectType[];
}

/**
 * Config for TILE_UNLOCK effect
 * Unlock a locked tile
 */
export interface TileUnlockConfig extends BaseEffectConfig {
  type: EffectType.TILE_UNLOCK;
  /** Number of tiles that can be unlocked */
  tilesCount: number;
}

/**
 * Config for REVEAL_PROGRESS effect
 * Reveal enemy team's board progress
 */
export interface RevealProgressConfig extends BaseEffectConfig {
  type: EffectType.REVEAL_PROGRESS;
  /** Duration in seconds the reveal lasts */
  durationSeconds: number;
}

/**
 * Union type for all effect configs
 * Use the `type` discriminator to narrow
 */
export type EffectConfig =
  | PointBonusConfig
  | PointMultiplierConfig
  | LineCompletionBonusConfig
  | TileSwapSelfConfig
  | TileSwapEnemyConfig
  | TileAutoCompleteConfig
  | TileProgressCopyConfig
  | TileLockConfig
  | TileProgressResetConfig
  | ProgressStealConfig
  | ShieldConfig
  | UnoReverseConfig
  | EffectImmunityConfig
  | EffectNegateConfig
  | TileUnlockConfig
  | RevealProgressConfig;

// ============================================================================
// EFFECT DEFINITION
// ============================================================================

/**
 * Configuration for an effect in the library
 * Stored in bingo_buffs_debuffs table
 */
export interface EffectDefinition {
  /** Unique identifier (human-readable slug) */
  id: string;
  /** Display name */
  name: string;
  /** Detailed description for players */
  description: string;
  /** buff or debuff (visual categorization) */
  type: 'buff' | 'debuff';
  /** Functional category for UI grouping */
  category: EffectCategory;
  /** What the effect targets */
  target: EffectTarget;
  /** How/when it triggers */
  trigger: EffectTrigger;
  /** Typed configuration based on effect type */
  config: EffectConfig;
  /** Icon identifier for UI */
  icon?: string;
  /** Whether this is currently available in the system */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper to get the effect type from an EffectDefinition
 */
export const getEffectType = (def: EffectDefinition): EffectType => def.config.type;

/**
 * An effect that a team has earned and may use
 * Stored in team_earned_effects table
 */
export interface TeamEarnedEffect {
  id: string;
  /** The team that owns this effect */
  teamId: string;
  /** The event this belongs to */
  eventId: string;
  /** Reference to the effect definition */
  buffDebuffId: string;
  /** How the effect was earned */
  source: EffectSource;
  /** For line completions: which line (e.g., "row_3", "column_B") */
  sourceIdentifier?: string;
  /** Current status */
  status: EarnedEffectStatus;
  /** When this effect was earned */
  earnedAt: Date;
  /** When this effect was used (if used) */
  usedAt?: Date;
  /** For offensive effects: which team was targeted */
  usedOnTeamId?: string;
  /** For time-limited effects: when it expires */
  expiresAt?: Date;
  /** Remaining uses (for stackable effects) */
  remainingUses: number;
  /** Additional data about the effect use */
  metadata: EarnedEffectMetadata;
}

/**
 * Metadata for earned effects
 */
export interface EarnedEffectMetadata {
  /** For swaps: original tile positions */
  originalPositions?: string[];
  /** For swaps: new tile positions */
  newPositions?: string[];
  /** For progress steal: amount stolen */
  amountStolen?: number;
  /** For reflects: original effect that was reflected */
  reflectedEffectId?: string;
  /** For blocks: effect that was blocked */
  blockedEffectId?: string;
  /** Custom data */
  [key: string]: unknown;
}

/**
 * Log entry for effect activations
 * Stored in effect_activation_log table
 */
export interface EffectActivationLog {
  id: string;
  eventId: string;
  /** Team that initiated the effect */
  sourceTeamId: string;
  /** Team that was affected (null for self-target) */
  targetTeamId?: string;
  /** The effect that was activated */
  buffDebuffId: string;
  /** Reference to the earned effect */
  earnedEffectId?: string;
  /** What happened */
  action: EffectAction;
  /** Whether the effect succeeded or was blocked */
  success: boolean;
  /** If blocked/reflected, what blocked it */
  blockedByEffectId?: string;
  /** Result data */
  result: EffectResultData;
  /** When this happened */
  timestamp: Date;
}

/**
 * Types of actions in the activation log
 */
export enum EffectAction {
  /** Effect was earned (line/tile completion) */
  EARNED = 'earned',
  /** Effect was manually activated */
  ACTIVATED = 'activated',
  /** Effect was auto-triggered */
  AUTO_TRIGGERED = 'auto_triggered',
  /** Effect was reflected back to source */
  REFLECTED = 'reflected',
  /** Effect was blocked/negated */
  BLOCKED = 'blocked',
  /** Effect expired */
  EXPIRED = 'expired',
  /** Effect was removed by admin */
  REMOVED = 'removed'
}

/**
 * Result data from effect activation
 */
export interface EffectResultData {
  /** Points added/removed */
  pointsChanged?: number;
  /** Tiles that were affected */
  tilesAffected?: string[];
  /** Progress values changed */
  progressChanged?: Record<string, number>;
  /** Message to display */
  message?: string;
  /** Additional result data */
  [key: string]: unknown;
}

// ============================================================================
// LINE COMPLETION TYPES
// ============================================================================

/**
 * Represents a completed line (row or column)
 */
export interface LineCompletion {
  type: 'row' | 'column';
  identifier: string; // Row number or column letter
  boardId: string;
  teamId: string;
  eventId: string;
  completedAt: Date;
  /** Tiles that make up this line */
  tileIds: string[];
  /** Total points from tiles in this line */
  tilePoints: number;
}

/**
 * Configuration for line effects in event config
 */
export interface LineEffectConfig {
  /** Which line this applies to */
  lineType: 'row' | 'column';
  lineIdentifier: string;
  /** Effect to grant when line is completed */
  buffDebuffId: string;
  /** Optional: custom metadata for this instance */
  metadata?: EffectMetadata;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Request to use an earned effect
 */
export interface UseEffectRequest {
  /** ID of the earned effect to use */
  earnedEffectId: string;
  /** For enemy-targeting effects: which team to target */
  targetTeamId?: string;
  /** For tile manipulation: which tiles to affect */
  targetTileIds?: string[];
  /** For swaps: positions to swap to */
  targetPositions?: string[];
}

/**
 * Response from using an effect
 */
export interface UseEffectResponse {
  success: boolean;
  /** What happened */
  action: EffectAction;
  /** Detailed result */
  result: EffectResultData;
  /** If blocked, info about the blocker */
  blockedBy?: {
    effectId: string;
    teamId: string;
    effectName: string;
  };
  /** Updated state of the earned effect */
  earnedEffect: TeamEarnedEffect;
  /** Any new effects earned as a result (e.g., reflected) */
  newEffects?: TeamEarnedEffect[];
}

/**
 * Team's current effect state (for API responses)
 */
export interface TeamEffectState {
  /** Effects available to use */
  available: TeamEarnedEffect[];
  /** Active passive effects */
  activePassive: TeamEarnedEffect[];
  /** Active defensive effects (shields, etc.) */
  activeDefense: TeamEarnedEffect[];
  /** Recently used effects */
  recentlyUsed: TeamEarnedEffect[];
}


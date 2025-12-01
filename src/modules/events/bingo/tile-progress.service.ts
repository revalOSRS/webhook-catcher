/**
 * Tile Progress Service
 * 
 * Main service for tracking bingo tile progress from game events.
 * 
 * Flow:
 * 1. Dink webhook sends game events (drops, kills, etc.)
 * 2. Event is adapted to a unified format
 * 3. Player's active team memberships are looked up
 * 4. Matching board tiles are found and progress is calculated
 * 5. Database is updated and Discord notifications are sent
 */

import { query } from '../../../db/connection.js';
import { adaptDinkEvent } from './adapters/dink.adapter.js';
import { matchesRequirement } from './matchers/requirement-matcher.js';
import { calculateItemDropProgress } from './calculators/item-drop.calculator.js';
import { calculatePetProgress } from './calculators/pet.calculator.js';
import { calculateValueDropProgress } from './calculators/value-drop.calculator.js';
import { calculateSpeedrunProgress } from './calculators/speedrun.calculator.js';
import { calculateBaGamblesProgress } from './calculators/ba-gambles.calculator.js';
import { calculateExperienceProgress } from './calculators/experience.calculator.js';
import { calculateChatProgress } from './calculators/chat.calculator.js';
import { DiscordNotificationsService } from './discord-notifications.service.js';
import type { UnifiedGameEvent } from './types/unified-event.type.js';
import type { DinkEvent } from '../../dink/events/event.js';
import type {
  BingoTileRequirements,
  TieredRequirementDef,
  ItemDropRequirement,
  PetRequirement,
  ValueDropRequirement,
  SpeedrunRequirement,
  ExperienceRequirement,
  BaGamblesRequirement,
  ChatRequirement,
  BingoTileRequirementDef,
  ProgressMetadata,
  TierCompletion,
  ProgressResult,
  ExistingProgress,
  SpeedrunPlayerContribution
} from './types/bingo-requirements.type.js';
import { BingoTileMatchType, BingoTileRequirementType } from './types/bingo-requirements.type.js';
import type { BingoTileProgress } from './entities/bingo-tile-progress.entity.js';
import { BingoTileCompletionType } from './types/bingo-tile-completion-type.type.js';
import type { BingoBoardTile } from './entities/bingo-board-tiles.entity.js';

/**
 * Extended board tile with joined data from related tables.
 * Combines data from: bingo_board_tiles, bingo_boards, bingo_tiles, events, event_teams
 */
interface ActiveBoardTile extends Pick<BingoBoardTile, 'id' | 'isCompleted' | 'position'> {
  boardId: string;
  tileId: string;
  teamId: string;
  eventId: string;
  eventStartDate: Date;
  requirements: BingoTileRequirements;
  tileTask?: string;
  eventName?: string;
  teamName?: string;
}

/**
 * Service for tracking bingo tile progress from game events.
 * 
 * This service is the core of the bingo progress tracking system. It:
 * - Receives game events from the Dink webhook
 * - Finds all tiles that could be affected by the event
 * - Calculates new progress values based on requirement type
 * - Updates the database with new progress
 * - Sends Discord notifications for completions
 * 
 * Progress is tracked at the team level, not individual player level,
 * meaning all team members contribute to the same tile progress.
 */
export class TileProgressService {
  /**
   * Main entry point for processing Dink webhook events.
   * 
   * Converts the Dink event to a unified format and processes it.
   * Returns early if the event type is not supported for bingo tracking.
   * 
   * @param dinkEvent - Raw event from Dink webhook
   */
  processDinkEvent = async (dinkEvent: DinkEvent): Promise<void> => {
    const unifiedEvent = await adaptDinkEvent(dinkEvent);
    if (!unifiedEvent) return;

    await this.processUnifiedEvent(unifiedEvent);
  };

  /**
   * Process a unified game event and update progress for all matching tiles.
   * 
   * For each tile owned by teams the player is on:
   * 1. Check if the event matches the tile's requirements
   * 2. Skip if tile is already fully completed
   * 3. Calculate and persist new progress
   * 
   * @param event - Unified event with normalized data structure
   */
  private processUnifiedEvent = async (event: UnifiedGameEvent): Promise<void> => {
    const boardTiles = await this.getActiveBoardTilesForPlayer(event);
    if (boardTiles.length === 0) return;

    for (const tile of boardTiles) {
      if (!matchesRequirement(event, tile.requirements)) continue;

      const existingProgress = await this.getExistingProgress(tile.id);
      
      if (this.shouldSkipTile(tile, existingProgress)) continue;

      await this.updateTileProgress(event, tile, existingProgress);
    }
  };

  /**
   * Determine if a tile should be skipped (already completed).
   * 
   * Logic:
   * - If no existing progress, use tile's is_completed flag
   * - If tile has tiered requirements, only skip if ALL tiers are done
   * - For non-tiered tiles, skip if the tile is completed
   * 
   * @param tile - The board tile being checked
   * @param existingProgress - Current progress record, if any
   * @returns true if tile should be skipped
   */
  private shouldSkipTile = (
    tile: ActiveBoardTile,
    existingProgress: BingoTileProgress | null
  ): boolean => {
    if (!existingProgress) return tile.isCompleted;

    // If tile is completed, check if there are incomplete tiers we should still track
    if (existingProgress.completedAt) {
      const hasTiers = tile.requirements.tiers && tile.requirements.tiers.length > 0;
      if (hasTiers) {
        const completedTierCount = existingProgress.progressMetadata.completedTiers?.length || 0;
        return completedTierCount >= tile.requirements.tiers.length;
      }
      return true;
    }

    return false;
  };

  /**
   * Find all active board tiles for a player based on their team memberships.
   * 
   * Query flow:
   * 1. Look up OSRS account ID from player name if not provided
   * 2. Find all teams the player is on in active events
   * 3. Get all incomplete tiles (plus completed tiles with incomplete tiers)
   * 
   * @param event - Unified game event containing player info
   * @returns Array of board tiles the player can contribute to
   */
  private getActiveBoardTilesForPlayer = async (event: UnifiedGameEvent): Promise<ActiveBoardTile[]> => {
    let osrsAccountId = event.osrsAccountId;

    if (!osrsAccountId && event.playerName) {
      const accounts = await query<{ id: number }>(
        'SELECT id FROM osrs_accounts WHERE osrs_nickname = $1 LIMIT 1',
        [event.playerName]
      );
      osrsAccountId = accounts[0]?.id;
    }

    if (!osrsAccountId) return [];

    // Get team memberships for active events (within date range)
    const memberships = await query<{ teamId: string; eventId: string; eventStartDate: Date }>(`
      SELECT DISTINCT et.id as team_id, e.id as event_id, e.start_date as event_start_date
      FROM event_team_members etm
      JOIN event_teams et ON etm.team_id = et.id
      JOIN events e ON et.event_id = e.id
      WHERE etm.osrs_account_id = $1
        AND e.status = 'active'
        AND (e.start_date IS NULL OR e.start_date <= NOW())
        AND (e.end_date IS NULL OR e.end_date > NOW())
    `, [osrsAccountId]);

    if (memberships.length === 0) return [];

    const teamIds = memberships.map(m => m.teamId);

    // Get board tiles for these teams
    // Include completed tiles with tiers so we can track incomplete tier progress
    const tiles = await query(`
      SELECT
        bbt.id, bbt.position, bbt.is_completed,
        bbt.board_id, bbt.tile_id,
        bb.team_id, bt.requirements, bt.task as tile_task,
        e.name as event_name, et.name as team_name
      FROM bingo_board_tiles bbt
      JOIN bingo_boards bb ON bbt.board_id = bb.id
      JOIN bingo_tiles bt ON bbt.tile_id = bt.id
      JOIN events e ON bb.event_id = e.id
      JOIN event_teams et ON bb.team_id = et.id
      WHERE bb.team_id = ANY($1::uuid[])
        AND (bbt.is_completed = false
          OR (bt.requirements->'tiers' IS NOT NULL
            AND jsonb_array_length(bt.requirements->'tiers') > 0))
    `, [teamIds]);

    return tiles.map((tile: Record<string, unknown>) => {
      const membership = memberships.find(m => m.teamId === tile.teamId);
      return {
        id: tile.id as string,
        boardId: tile.boardId as string,
        tileId: tile.tileId as string,
        position: tile.position as string,
        isCompleted: tile.isCompleted as boolean,
        teamId: tile.teamId as string,
        eventId: membership?.eventId || '',
        eventStartDate: membership?.eventStartDate || new Date(),
        requirements: tile.requirements as BingoTileRequirements,
        tileTask: tile.tileTask as string | undefined,
        eventName: tile.eventName as string | undefined,
        teamName: tile.teamName as string | undefined
      };
    });
  };

  /**
   * Update tile progress for an event.
   * 
   * This is the main progress update flow:
   * 1. Calculate new progress based on requirement type
   * 2. Determine if a single player completed it (for attribution)
   * 3. Persist to database (insert or update)
   * 4. Mark tile as completed if all requirements met
   * 5. Send Discord notification for new completions
   * 
   * @param event - The game event being processed
   * @param tile - The tile to update
   * @param existingProgress - Current progress, if any
   */
  private updateTileProgress = async (
    event: UnifiedGameEvent,
    tile: ActiveBoardTile,
    existingProgress: BingoTileProgress | null
  ): Promise<void> => {
    const memberId = event.osrsAccountId
      ? await this.getMemberIdFromOsrsAccount(event.osrsAccountId, tile.teamId)
      : undefined;

    const updatedProgress = await this.calculateProgress(
      event,
      tile.requirements,
      existingProgress,
      tile.eventStartDate,
      memberId,
      event.osrsAccountId,
      event.playerName
    );

    const completedByOsrsAccountId = this.getCompletedByAccountId(updatedProgress, existingProgress);

    // Upsert progress
    if (existingProgress) {
      await this.updateProgress(tile.id, updatedProgress, completedByOsrsAccountId);
    } else {
      await this.insertProgress(tile.id, updatedProgress, completedByOsrsAccountId);
    }

    // Check for tile completion
    const wasCompleted = tile.isCompleted;
    const isTileCompleted = this.determineTileCompletion(tile.requirements, updatedProgress);

    if (isTileCompleted && !wasCompleted) {
      await this.markTileCompleted(tile.id, completedByOsrsAccountId);
    }

    await this.sendNotificationIfNeeded(event, tile, existingProgress, updatedProgress, isTileCompleted, wasCompleted);
  };

  /**
   * Determine which OSRS account completed the tile (for attribution).
   * 
   * We track this so we can show "completed by Player X" in the UI.
   * Only set if a single player completed the requirement (not a team effort).
   * 
   * @param updatedProgress - New progress after this event
   * @param existingProgress - Previous progress state
   * @returns OSRS account ID of the completer, or null
   */
  private getCompletedByAccountId = (
    updatedProgress: ProgressResult,
    existingProgress: BingoTileProgress | null
  ): number | null => {
    if (existingProgress?.completedByOsrsAccountId) {
      return existingProgress.completedByOsrsAccountId;
    }

    // Check if only one player has contributed
    const contributions = updatedProgress.progressMetadata.playerContributions;
    if (contributions?.length === 1 && updatedProgress.isCompleted) {
      return contributions[0].osrsAccountId;
    }

    return null;
  };

  /**
   * Determine if a tile is completed based on requirements and progress.
   * 
   * Match types:
   * - ALL: Every requirement must be completed
   * - ANY: At least one requirement must be completed
   * 
   * For tiered requirements, completion means at least one tier is done.
   * 
   * @param requirements - Tile requirement configuration
   * @param progress - Current progress result
   * @returns true if tile completion criteria is met
   */
  private determineTileCompletion = (
    requirements: BingoTileRequirements,
    progress: ProgressResult
  ): boolean => {
    // For tiered requirements, check if at least one tier is complete
    if (requirements.tiers && requirements.tiers.length > 0) {
      const completedTiers = progress.completedTiers || progress.progressMetadata.completedTiers;
      return (completedTiers?.length || 0) > 0;
    }

    // For regular requirements, use the isCompleted flag from progress calculation
    return progress.isCompleted;
  };

  /**
   * Calculate progress for requirements (tiered or regular).
   * 
   * Routes to appropriate calculator based on requirement structure:
   * - Tiered requirements: Special handling for tier progression
   * - Regular requirements: Direct calculation for each matching requirement
   * 
   * @param event - The game event
   * @param requirements - Tile's requirement configuration
   * @param existing - Current progress state
   * @param eventStartDate - Event start (for experience tracking)
   * @param memberId - Team member ID for contribution tracking
   * @param osrsAccountId - OSRS account for attribution
   * @param playerName - Player name for display
   * @returns Calculated progress result
   */
  private calculateProgress = async (
    event: UnifiedGameEvent,
    requirements: BingoTileRequirements,
    existing: BingoTileProgress | null,
    eventStartDate: Date,
    memberId?: number,
    osrsAccountId?: number,
    playerName?: string
  ): Promise<ProgressResult> => {
    // Convert BingoTileProgress to ExistingProgress format for calculators
    const existingForCalc = this.toExistingProgress(existing);

    if (requirements.tiers && requirements.tiers.length > 0) {
      return this.calculateTieredProgress(
        event, requirements, existingForCalc, eventStartDate, memberId, osrsAccountId, playerName
      );
    }

    // Handle regular (non-tiered) requirements
    if (requirements.requirements && requirements.requirements.length > 0) {
      for (const req of requirements.requirements) {
        const singleReq: BingoTileRequirements = {
          matchType: BingoTileMatchType.ALL,
          requirements: [req],
          tiers: []
        };
        if (matchesRequirement(event, singleReq)) {
          return await this.calculateRequirementProgress(
            event,
            req,
            existingForCalc,
            eventStartDate,
            undefined,
            memberId,
            osrsAccountId,
            playerName
          );
        }
      }
    }

    // No matching requirement found - return existing or empty progress
    return this.buildEmptyProgress(existing, requirements);
  };

  /**
   * Convert BingoTileProgress to ExistingProgress format for calculators.
   */
  private toExistingProgress = (progress: BingoTileProgress | null): ExistingProgress | null => {
    if (!progress) return null;

    return {
      progressValue: progress.progressValue,
      progressMetadata: progress.progressMetadata
    };
  };

  /**
   * Build an empty/unchanged progress result preserving existing state
   */
  private buildEmptyProgress = (
    existing: BingoTileProgress | null,
    requirements: BingoTileRequirements
  ): ProgressResult => {
    if (existing) {
      return {
        progressValue: existing.progressValue,
        progressMetadata: existing.progressMetadata,
        isCompleted: existing.completedAt !== undefined
      };
    }

    // Determine requirement type from the first available requirement
    const firstReq = requirements.requirements?.[0] || requirements.tiers?.[0]?.requirement;
    const reqType = firstReq?.type || BingoTileRequirementType.ITEM_DROP;

    return {
      progressValue: 0,
      progressMetadata: this.createEmptyMetadata(reqType),
      isCompleted: false
    };
  };

  /**
   * Create empty metadata for a given requirement type.
   */
  private createEmptyMetadata = (type: BingoTileRequirementType): ProgressMetadata => {
    const base = {
      targetValue: 0,
      lastUpdateAt: new Date().toISOString(),
      playerContributions: []
    };

    switch (type) {
      case BingoTileRequirementType.SPEEDRUN:
        return { ...base, requirementType: type, currentBestTimeSeconds: Infinity, goalSeconds: 0 } as ProgressMetadata;
      case BingoTileRequirementType.ITEM_DROP:
        return { ...base, requirementType: type, currentTotalCount: 0 } as ProgressMetadata;
      case BingoTileRequirementType.VALUE_DROP:
        return { ...base, requirementType: type, currentBestValue: 0 } as ProgressMetadata;
      case BingoTileRequirementType.PET:
        return { ...base, requirementType: type, currentTotalCount: 0 } as ProgressMetadata;
      case BingoTileRequirementType.EXPERIENCE:
        return { ...base, requirementType: type, skill: '', currentTotalXp: 0, targetXp: 0 } as ProgressMetadata;
      case BingoTileRequirementType.BA_GAMBLES:
        return { ...base, requirementType: type, currentTotalGambles: 0 } as ProgressMetadata;
      case BingoTileRequirementType.CHAT:
        return { ...base, requirementType: type, targetCount: 0, currentTotalCount: 0 } as ProgressMetadata;
      default:
        return { ...base, requirementType: BingoTileRequirementType.ITEM_DROP, currentTotalCount: 0 } as ProgressMetadata;
    }
  };

  /**
   * Calculate progress for tiered requirements.
   * 
   * Tiered requirements have multiple levels (e.g., Bronze/Silver/Gold).
   * Completing a higher tier automatically completes all lower tiers.
   * 
   * Special handling for speedruns vs other types:
   * - Speedruns: Check ALL tiers against current time (lower is better)
   * - Others: Check one tier per event (progress accumulates)
   * 
   * @returns Progress result with tier-specific data
   */
  private calculateTieredProgress = async (
    event: UnifiedGameEvent,
    requirements: BingoTileRequirements,
    existing: ExistingProgress | null,
    eventStartDate: Date,
    memberId?: number,
    osrsAccountId?: number,
    playerName?: string
  ): Promise<ProgressResult> => {
    const existingCompletedTiers = existing?.progressMetadata?.completedTiers || [];
    const completedTierNumbers = existingCompletedTiers.map(t => t.tier);

    const isSpeedrun = requirements.tiers![0]?.requirement?.type === BingoTileRequirementType.SPEEDRUN;

    if (isSpeedrun) {
      return this.calculateSpeedrunTieredProgress(
        event, requirements, existing, completedTierNumbers, osrsAccountId, playerName
      );
    }

    return this.calculateRegularTieredProgress(
      event, requirements, existing, eventStartDate, completedTierNumbers, memberId, osrsAccountId, playerName
    );
  };

  /**
   * Calculate speedrun-specific tiered progress.
   * 
   * Speedrun tiers work differently: a single fast time can complete multiple tiers.
   * For example, a 1:30 time might complete Tier 1 (< 2:00), Tier 2 (< 1:45), and Tier 3 (< 1:30).
   * 
   * Logic:
   * 1. Verify the event location matches the required boss/raid
   * 2. Sort tiers by goal time (easiest first)
   * 3. For each tier, check if current time qualifies
   * 4. Auto-complete all lower tiers when a higher tier is completed
   * 
   * @returns Progress with best time and tier completions
   */
  private calculateSpeedrunTieredProgress = async (
    event: UnifiedGameEvent,
    requirements: BingoTileRequirements,
    existing: ExistingProgress | null,
    completedTierNumbers: number[],
    osrsAccountId?: number,
    playerName?: string
  ): Promise<ProgressResult> => {
    const speedrunData = event.data as { timeSeconds: number; location?: string; isPersonalBest?: boolean };
    const currentTime = speedrunData.timeSeconds;
    const eventLocation = speedrunData.location?.toLowerCase();

    // Verify location matches
    const firstTierLocation = (requirements.tiers![0]?.requirement as SpeedrunRequirement).location?.toLowerCase();
    if (eventLocation !== firstTierLocation) {
      if (existing) {
        return {
          progressValue: existing.progressValue,
          progressMetadata: existing.progressMetadata,
          isCompleted: (existing.progressMetadata.completedTiers?.length || 0) > 0
        };
      }
      return this.buildEmptyProgress(null, requirements);
    }

    // Sort tiers by goal time (ascending - easier goals first)
    const sortedTiers = [...requirements.tiers!].sort((a, b) => {
      const aGoal = (a.requirement as SpeedrunRequirement).goalSeconds;
      const bGoal = (b.requirement as SpeedrunRequirement).goalSeconds;
      return bGoal - aGoal; // Easier (higher time) first
    });

    // Track best time (lower is better for speedruns)
    const existingBestTime = existing?.progressValue || Infinity;
    const bestTime = Math.min(existingBestTime, currentTime);

    const newCompletedTiers: TierCompletion[] = [...(existing?.progressMetadata?.completedTiers || [])];
    const updatedCompletedNumbers = [...completedTierNumbers];

    for (const tier of sortedTiers) {
      const tierReq = tier.requirement as SpeedrunRequirement;
      const tierQualifies = bestTime <= tierReq.goalSeconds;

      if (tierQualifies && !updatedCompletedNumbers.includes(tier.tier)) {
        newCompletedTiers.push({
          tier: tier.tier,
          completedAt: new Date().toISOString(),
          completedByOsrsAccountId: osrsAccountId || 0
        });
        updatedCompletedNumbers.push(tier.tier);

        // Auto-complete all lower tiers
        for (const lowerTier of requirements.tiers!.filter(t => t.tier < tier.tier)) {
          if (!updatedCompletedNumbers.includes(lowerTier.tier)) {
            newCompletedTiers.push({
              tier: lowerTier.tier,
              completedAt: new Date().toISOString(),
              completedByOsrsAccountId: osrsAccountId || 0
            });
            updatedCompletedNumbers.push(lowerTier.tier);
          }
        }
      }
    }

    // Update player contributions
    const existingContributions = (existing?.progressMetadata as { playerContributions?: SpeedrunPlayerContribution[] } | undefined)?.playerContributions || [];
    const playerContributions = this.updateSpeedrunContributions(
      existingContributions,
      currentTime,
      osrsAccountId,
      playerName,
      speedrunData.isPersonalBest || false
    );

    const targetGoal = (sortedTiers[sortedTiers.length - 1]?.requirement as SpeedrunRequirement)?.goalSeconds || 0;

    const progressMetadata: ProgressMetadata = {
      requirementType: BingoTileRequirementType.SPEEDRUN,
      currentBestTimeSeconds: bestTime,
      goalSeconds: targetGoal,
      targetValue: targetGoal,
      lastUpdateAt: new Date().toISOString(),
      completedTiers: newCompletedTiers.length > 0 ? newCompletedTiers : undefined,
      currentTier: updatedCompletedNumbers.length > 0 ? Math.max(...updatedCompletedNumbers) : undefined,
      playerContributions
    };

    return {
      progressValue: bestTime,
      progressMetadata,
      isCompleted: newCompletedTiers.length > 0,
      completedTiers: newCompletedTiers
    };
  };

  /**
   * Update speedrun player contributions with a new attempt
   */
  private updateSpeedrunContributions = (
    existing: SpeedrunPlayerContribution[],
    timeSeconds: number,
    osrsAccountId?: number,
    playerName?: string,
    isPersonalBest?: boolean
  ): SpeedrunPlayerContribution[] => {
    if (!osrsAccountId) return existing;

    const contributions = [...existing];
    const existingContrib = contributions.find(c => c.osrsAccountId === osrsAccountId);

    const newAttempt = {
      timeSeconds,
      timestamp: new Date().toISOString(),
      isPersonalBest: isPersonalBest || false
    };

    if (existingContrib) {
      existingContrib.bestTimeSeconds = Math.min(existingContrib.bestTimeSeconds || Infinity, timeSeconds);
      existingContrib.attempts = existingContrib.attempts || [];
      existingContrib.attempts.push(newAttempt);
    } else {
      contributions.push({
        osrsAccountId,
        osrsNickname: playerName || 'Unknown',
        bestTimeSeconds: timeSeconds,
        attempts: [newAttempt]
      });
    }

    return contributions;
  };

  /**
   * Calculate regular (non-speedrun) tiered progress.
   * 
   * For non-speedrun tiers (item drops, experience, etc.), progress accumulates
   * across events. After calculating new progress, we check ALL tiers to see
   * which ones are now complete based on the final progressValue.
   * 
   * This allows scenarios like:
   * - Tier 1: Get 1 item from list (totalAmount: 1)
   * - Tier 2: Get 2 items from list (totalAmount: 2)
   * - Tier 3: Get 4 items from list (totalAmount: 4)
   * 
   * If you get 3 items, Tiers 1 and 2 are both completed.
   * 
   * @returns Progress with accumulated values and tier completions
   */
  private calculateRegularTieredProgress = async (
    event: UnifiedGameEvent,
    requirements: BingoTileRequirements,
    existing: ExistingProgress | null,
    eventStartDate: Date,
    completedTierNumbers: number[],
    memberId?: number,
    osrsAccountId?: number,
    playerName?: string
  ): Promise<ProgressResult> => {
    const newCompletedTiers: TierCompletion[] = [...(existing?.progressMetadata?.completedTiers || [])];
    const updatedCompletedNumbers = [...completedTierNumbers];

    // Find the first matching tier to use its calculator for progress tracking
    let tierResult: ProgressResult | null = null;
    
    for (const tier of requirements.tiers!) {
      const tierReq: BingoTileRequirements = {
        matchType: BingoTileMatchType.ALL,
        requirements: [],
        tiers: [tier]
      };
      if (!matchesRequirement(event, tierReq)) continue;

      // Calculate progress using this tier's requirement
      // This accumulates items/xp/etc. into progressValue
      tierResult = await this.calculateRequirementProgress(
        event,
        tier.requirement,
        existing,
        eventStartDate,
        tier,
        memberId,
        osrsAccountId,
        playerName
      );
      
      // Only need to calculate once - progress is cumulative
      break;
    }

    // If no matching tier found, return existing progress
    if (!tierResult) {
      if (existing) {
        return {
          progressValue: existing.progressValue,
          progressMetadata: existing.progressMetadata,
          isCompleted: (existing.progressMetadata.completedTiers?.length || 0) > 0
        };
      }
      return this.buildEmptyProgress(null, requirements);
    }

    // Now check ALL tiers to see which are complete based on the new progressValue
    // Sort tiers by tier number (ascending) to process in order
    const sortedTiers = [...requirements.tiers!].sort((a, b) => a.tier - b.tier);
    
    for (const tier of sortedTiers) {
      if (updatedCompletedNumbers.includes(tier.tier)) continue;

      // Check if this tier is now complete based on current progress
      const isThisTierComplete = this.isTierComplete(
        tier.requirement,
        tierResult.progressValue,
        tierResult.progressMetadata
      );

      if (isThisTierComplete) {
        newCompletedTiers.push({
          tier: tier.tier,
          completedAt: new Date().toISOString(),
          completedByOsrsAccountId: osrsAccountId || 0
        });
        updatedCompletedNumbers.push(tier.tier);
      }
    }

    // Update metadata with tier info
    const updatedMetadata: ProgressMetadata = {
      ...tierResult.progressMetadata,
      completedTiers: newCompletedTiers.length > 0 ? newCompletedTiers : undefined,
      currentTier: updatedCompletedNumbers.length > 0 ? Math.max(...updatedCompletedNumbers) : undefined
    };

    return {
      progressValue: tierResult.progressValue,
      progressMetadata: updatedMetadata,
      isCompleted: newCompletedTiers.length > 0,
      completedTiers: newCompletedTiers
    };
  };

  /**
   * Check if a specific tier is complete based on current progress.
   * 
   * Compares progressValue against the tier's requirement target:
   * - ITEM_DROP with totalAmount: progressValue >= totalAmount
   * - ITEM_DROP per-item: each item has met its individual target
   * - EXPERIENCE: progressValue >= target experience
   * - BA_GAMBLES: progressValue >= target gambles
   * - VALUE_DROP: progressValue >= target value
   * - PET: progressValue >= target pet count
   * 
   * @param requirement - The tier's requirement definition
   * @param progressValue - Current accumulated progress value
   * @param metadata - Current progress metadata (for per-item tracking)
   * @returns true if the tier's requirement is satisfied
   */
  private isTierComplete = (
    requirement: BingoTileRequirementDef,
    progressValue: number,
    metadata: ProgressMetadata
  ): boolean => {
    switch (requirement.type) {
      case BingoTileRequirementType.ITEM_DROP: {
        const itemReq = requirement as ItemDropRequirement;
        
        // Total amount mode: compare progressValue against totalAmount
        if (itemReq.totalAmount !== undefined) {
          return progressValue >= itemReq.totalAmount;
        }
        
        // Per-item mode: need to check each item has met its target
        // This requires looking at the metadata's playerContributions
        const itemMetadata = metadata as import('./types/bingo-requirements.type.js').ItemDropProgressMetadata;
        if (!itemMetadata.playerContributions) return false;
        
        // Aggregate items across all players
        const itemTotals: Record<number, number> = {};
        for (const player of itemMetadata.playerContributions) {
          for (const item of player.items) {
            itemTotals[item.itemId] = (itemTotals[item.itemId] ?? 0) + item.quantity;
          }
        }
        
        // Check each required item meets its target
        for (const reqItem of itemReq.items) {
          const requiredAmount = reqItem.itemAmount ?? 1;
          const currentAmount = itemTotals[reqItem.itemId] ?? 0;
          if (currentAmount < requiredAmount) {
            return false;
          }
        }
        return true;
      }
      
      case BingoTileRequirementType.EXPERIENCE: {
        const expReq = requirement as ExperienceRequirement;
        return progressValue >= expReq.experience;
      }
      
      case BingoTileRequirementType.BA_GAMBLES: {
        const baReq = requirement as BaGamblesRequirement;
        return progressValue >= baReq.amount;
      }
      
      case BingoTileRequirementType.VALUE_DROP: {
        const valueReq = requirement as ValueDropRequirement;
        return progressValue >= valueReq.value;
      }
      
      case BingoTileRequirementType.PET: {
        const petReq = requirement as PetRequirement;
        return progressValue >= (petReq.amount ?? 1);
      }
      
      case BingoTileRequirementType.CHAT: {
        const chatReq = requirement as ChatRequirement;
        return progressValue >= (chatReq.count ?? 1);
      }
      
      // Speedruns are handled separately in calculateSpeedrunTieredProgress
      case BingoTileRequirementType.SPEEDRUN:
        return false;
      
      default:
        return false;
    }
  };

  /**
   * Calculate progress for a specific requirement type.
   * 
   * Routes to the appropriate calculator based on requirement type:
   * - ITEM_DROP: Count specific items obtained
   * - PET: Track pet drops
   * - VALUE_DROP: Track high-value drops
   * - SPEEDRUN: Track completion times
   * - BA_GAMBLES: Track Barbarian Assault gambles
   * - EXPERIENCE: Track XP gained (relative to event start)
   * 
   * @returns Progress value, metadata, and completion status
   */
  private calculateRequirementProgress = async (
    event: UnifiedGameEvent,
    requirement: BingoTileRequirementDef,
    existing: ExistingProgress | null,
    eventStartDate: Date,
    tier?: TieredRequirementDef,
    memberId?: number,
    osrsAccountId?: number,
    playerName?: string
  ): Promise<ProgressResult> => {
    const req = requirement;

    switch (req.type) {
      case BingoTileRequirementType.ITEM_DROP:
        return calculateItemDropProgress(event, req as ItemDropRequirement, existing, memberId, osrsAccountId, playerName);
      case BingoTileRequirementType.PET:
        return calculatePetProgress(event, req as PetRequirement, existing, memberId, osrsAccountId, playerName);
      case BingoTileRequirementType.VALUE_DROP:
        return calculateValueDropProgress(event, req as ValueDropRequirement, existing, memberId, osrsAccountId, playerName);
      case BingoTileRequirementType.SPEEDRUN:
        return calculateSpeedrunProgress(event, tier || req as SpeedrunRequirement, existing, memberId, osrsAccountId, playerName);
      case BingoTileRequirementType.BA_GAMBLES:
        return calculateBaGamblesProgress(event, req as BaGamblesRequirement, existing, memberId, osrsAccountId, playerName);
      case BingoTileRequirementType.EXPERIENCE:
        return await calculateExperienceProgress(event, req as ExperienceRequirement, existing, eventStartDate, memberId, osrsAccountId, playerName);
      case BingoTileRequirementType.CHAT:
        return calculateChatProgress(event, req as ChatRequirement, existing, memberId, osrsAccountId, playerName);
      default:
        return this.buildEmptyProgress(null, { matchType: BingoTileMatchType.ALL, requirements: [req], tiers: [] });
    }
  };

  /**
   * Get member_id from osrs_account_id for a specific team.
   * 
   * The member_id is used for tracking individual contributions to team progress.
   */
  private getMemberIdFromOsrsAccount = async (osrsAccountId: number, teamId: string): Promise<number | undefined> => {
    const result = await query<{ member_id: number }>(
      'SELECT member_id FROM event_team_members WHERE osrs_account_id = $1 AND team_id = $2 LIMIT 1',
      [osrsAccountId, teamId]
    );
    return result[0]?.member_id;
  };

  /**
   * Get existing progress for a tile from the database.
   * 
   * @param boardTileId - The board tile to look up
   * @returns Current progress or null if none exists
   */
  private getExistingProgress = async (
    boardTileId: string
  ): Promise<BingoTileProgress | null> => {
    const result = await query(`
      SELECT id, board_tile_id, progress_value, progress_metadata, completion_type,
        completed_at, completed_by_osrs_account_id, created_at, updated_at
      FROM bingo_tile_progress WHERE board_tile_id = $1 LIMIT 1
    `, [boardTileId]);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id as string,
      boardTileId: row.board_tile_id as string,
      progressValue: parseFloat(row.progress_value as string) || 0,
      progressMetadata: row.progress_metadata as ProgressMetadata,
      completionType: row.completion_type as BingoTileCompletionType | undefined,
      completedByOsrsAccountId: row.completed_by_osrs_account_id as number | undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  };

  /**
   * Insert new progress record into the database.
   */
  private insertProgress = async (
    boardTileId: string,
    progress: ProgressResult,
    completedByOsrsAccountId: number | null
  ): Promise<void> => {
    await query(`
      INSERT INTO bingo_tile_progress (board_tile_id, progress_value, progress_metadata, completed_by_osrs_account_id)
      VALUES ($1, $2, $3, $4)
    `, [
      boardTileId,
      progress.progressValue,
      JSON.stringify(progress.progressMetadata),
      completedByOsrsAccountId
    ]);
  };

  /**
   * Update existing progress record in the database.
   */
  private updateProgress = async (
    boardTileId: string,
    progress: ProgressResult,
    completedByOsrsAccountId: number | null
  ): Promise<void> => {
    await query(`
      UPDATE bingo_tile_progress
      SET progress_value = $1, progress_metadata = $2, completed_by_osrs_account_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE board_tile_id = $4
    `, [
      progress.progressValue,
      JSON.stringify(progress.progressMetadata),
      completedByOsrsAccountId,
      boardTileId
    ]);
  };

  /**
   * Mark a tile as completed in both progress and board_tiles tables.
   */
  private markTileCompleted = async (boardTileId: string, completedByOsrsAccountId: number | null): Promise<void> => {
    await query(`
      UPDATE bingo_tile_progress
      SET completion_type = $1, completed_at = CURRENT_TIMESTAMP, completed_by_osrs_account_id = $2
      WHERE board_tile_id = $3
    `, [BingoTileCompletionType.AUTO, completedByOsrsAccountId, boardTileId]);

    await query(`
      UPDATE bingo_board_tiles
      SET is_completed = true, completed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_completed = false
    `, [boardTileId]);
  };

  /**
   * Send Discord notification if there's a new tier or tile completion.
   * 
   * Only sends notifications for:
   * - New tile completions (tile was just marked complete)
   * - New tier completions
   * 
   * Does NOT send notifications for:
   * - Progress updates without completions
   * - Already-completed tiles
   */
  private sendNotificationIfNeeded = async (
    event: UnifiedGameEvent,
    tile: ActiveBoardTile,
    existingProgress: BingoTileProgress | null,
    updatedProgress: ProgressResult,
    isTileCompleted: boolean,
    wasCompleted: boolean
  ): Promise<void> => {
    const previousTiers = existingProgress?.progressMetadata?.completedTiers || [];
    const currentTiers = updatedProgress.progressMetadata.completedTiers || [];

    const previousTierNumbers = previousTiers.map(t => t.tier);
    const currentTierNumbers = currentTiers.map(t => t.tier);

    const newlyCompletedTiers = currentTierNumbers.filter(t => !previousTierNumbers.includes(t));
    const hasNewTierCompletion = newlyCompletedTiers.length > 0;
    const isNewTileCompletion = isTileCompleted && !wasCompleted;

    if (!isNewTileCompletion && !hasNewTierCompletion) return;

    try {
      let playerName = event.playerName;
      if (event.osrsAccountId) {
        const accounts = await query<{ osrs_nickname: string }>(
          'SELECT osrs_nickname FROM osrs_accounts WHERE id = $1 LIMIT 1',
          [event.osrsAccountId]
        );
        playerName = accounts[0]?.osrs_nickname || playerName;
      }

      await DiscordNotificationsService.sendTileProgressNotification({
        teamId: tile.teamId,
        teamName: tile.teamName || 'Unknown Team',
        eventName: tile.eventName || 'Unknown Event',
        tileId: tile.tileId,
        tileTask: tile.tileTask || 'Unknown Task',
        tilePosition: tile.position || '?',
        playerName,
        progressValue: updatedProgress.progressValue,
        progressMetadata: updatedProgress.progressMetadata as unknown as Record<string, unknown>,
        isCompleted: isNewTileCompletion,
        completionType: isNewTileCompletion ? 'auto' : null,
        completedTiers: currentTierNumbers,
        totalTiers: tile.requirements.tiers?.length,
        newlyCompletedTiers: newlyCompletedTiers.length > 0 ? newlyCompletedTiers : undefined
      });
    } catch (error) {
      console.error('[TileProgressService] Error sending Discord notification:', error);
    }
  };
}

// Export a singleton instance for convenience
export const tileProgressService = new TileProgressService();


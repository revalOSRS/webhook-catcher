/**
 * Speedrun Progress Calculator
 * 
 * Tracks team progress toward speedrun time goals.
 * For speedruns, LOWER time is BETTER - we track the best (lowest) time.
 * 
 * Supports two modes:
 * 1. Single goal: Beat a specific time (e.g., complete ToB in under 25 minutes)
 * 2. Tiered goals: Multiple time thresholds with different point values
 * 
 * Completion: Best time <= goal time (any tier for tiered requirements)
 */

import type { UnifiedGameEvent } from '../types/unified-event.type.js';
import type {
  SpeedrunRequirement,
  TieredRequirementDef,
  SpeedrunProgressMetadata,
  SpeedrunPlayerContribution,
  TierCompletion,
  ProgressResult,
  ExistingProgress
} from '../types/bingo-requirements.type.js';
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';

/**
 * Speedrun event data structure
 */
interface SpeedrunEventData {
  timeSeconds: number;
  isPersonalBest?: boolean;
}

/**
 * Calculate speedrun progress for a team.
 * 
 * Logic:
 * 1. Extract completion time from event (in seconds)
 * 2. Find or create player's contribution record
 * 3. Add this attempt to player's history
 * 4. Update player's personal best if this is faster
 * 5. Calculate team's best time (minimum across all players)
 * 6. Compare against goal time to determine completion
 * 
 * Note: progressValue is the current best time in seconds.
 * Lower is better for speedruns.
 * 
 * @param event - The unified game event containing speedrun data
 * @param requirement - The speedrun requirement (goal time) or tiered requirement
 * @param existing - Existing progress from database, or null if first event
 * @param memberId - Discord member ID (optional)
 * @param osrsAccountId - OSRS account ID (required for tracking)
 * @param playerName - Player's OSRS name (required for display)
 * @returns Progress result with new values and completion status
 */
export const calculateSpeedrunProgress = (
  event: UnifiedGameEvent,
  requirement: SpeedrunRequirement | TieredRequirementDef,
  existing: ExistingProgress | null,
  memberId?: number,
  osrsAccountId?: number,
  playerName?: string
): ProgressResult => {
  // Check if this is a tiered requirement
  if ('tier' in requirement && 'points' in requirement) {
    return calculateTieredSpeedrunProgress(
      event, 
      requirement as TieredRequirementDef, 
      existing, 
      memberId, 
      osrsAccountId, 
      playerName
    );
  }
  
  return calculateSimpleSpeedrunProgress(
    event, 
    requirement as SpeedrunRequirement, 
    existing, 
    memberId, 
    osrsAccountId, 
    playerName
  );
};

/**
 * Calculate simple (non-tiered) speedrun progress.
 */
const calculateSimpleSpeedrunProgress = (
  event: UnifiedGameEvent,
  requirement: SpeedrunRequirement,
  existing: ExistingProgress | null,
  memberId?: number,
  osrsAccountId?: number,
  playerName?: string
): ProgressResult => {
  const speedrunData = event.data as SpeedrunEventData;
  const currentTime = speedrunData.timeSeconds;
  
  // Get existing metadata or create new
  const existingMetadata = existing?.progressMetadata as SpeedrunProgressMetadata | undefined;
  
  // Get or initialize player contributions
  const playerContributions = getOrInitPlayerContributions(
    existingMetadata, 
    osrsAccountId, 
    playerName, 
    memberId, 
    currentTime
  );
  
  // Update player's attempts and best time
  const playerContribution = playerContributions.find(p => p.osrsAccountId === osrsAccountId);
  if (playerContribution) {
    playerContribution.attempts.push({
      timeSeconds: currentTime,
      timestamp: event.timestamp.toISOString(),
      isPersonalBest: speedrunData.isPersonalBest ?? false
    });
    
    // Update best time if this is faster (lower)
    if (currentTime < playerContribution.bestTimeSeconds) {
      playerContribution.bestTimeSeconds = currentTime;
    }
  }
  
  // Calculate team's best time
  const currentBestTime = playerContributions.length > 0
    ? Math.min(...playerContributions.map(p => p.bestTimeSeconds))
    : currentTime;
  
  const progressMetadata: SpeedrunProgressMetadata = {
    requirementType: BingoTileRequirementType.SPEEDRUN,
    targetValue: requirement.goalSeconds,
    lastUpdateAt: event.timestamp.toISOString(),
    currentBestTimeSeconds: currentBestTime,
    goalSeconds: requirement.goalSeconds,
    playerContributions,
    completedTiers: existingMetadata?.completedTiers,
    currentTier: existingMetadata?.currentTier
  };
  
  return {
    progressValue: currentBestTime,
    progressMetadata,
    isCompleted: currentBestTime <= requirement.goalSeconds
  };
};

/**
 * Calculate tiered speedrun progress.
 * 
 * For tiered requirements, each tier has its own time goal.
 * Completing any tier marks the tile as complete.
 * Multiple tiers can be completed as times improve.
 */
const calculateTieredSpeedrunProgress = (
  event: UnifiedGameEvent,
  tieredReq: TieredRequirementDef,
  existing: ExistingProgress | null,
  memberId?: number,
  osrsAccountId?: number,
  playerName?: string
): ProgressResult => {
  const speedrunData = event.data as SpeedrunEventData;
  const currentTime = speedrunData.timeSeconds;
  const requirement = tieredReq.requirement as SpeedrunRequirement;
  
  // Get existing metadata or create new
  const existingMetadata = existing?.progressMetadata as SpeedrunProgressMetadata | undefined;
  
  // Get or initialize player contributions
  const playerContributions = getOrInitPlayerContributions(
    existingMetadata, 
    osrsAccountId, 
    playerName, 
    memberId, 
    currentTime
  );
  
  // Update player's attempts and best time
  const playerContribution = playerContributions.find(p => p.osrsAccountId === osrsAccountId);
  if (playerContribution) {
    playerContribution.attempts.push({
      timeSeconds: currentTime,
      timestamp: event.timestamp.toISOString(),
      isPersonalBest: speedrunData.isPersonalBest ?? false
    });
    
    if (currentTime < playerContribution.bestTimeSeconds) {
      playerContribution.bestTimeSeconds = currentTime;
    }
  }
  
  // Calculate team's best time
  const currentBestTime = playerContributions.length > 0
    ? Math.min(...playerContributions.map(p => p.bestTimeSeconds))
    : currentTime;
  
  // Track tier completions
  const completedTiers: TierCompletion[] = existingMetadata?.completedTiers 
    ? [...existingMetadata.completedTiers] 
    : [];
  const completedTierNumbers = completedTiers.map(t => t.tier);
  
  // Check if this tier is now completed
  const tierJustCompleted = currentBestTime <= requirement.goalSeconds && 
                            !completedTierNumbers.includes(tieredReq.tier);
  
  if (tierJustCompleted && osrsAccountId) {
    completedTiers.push({
      tier: tieredReq.tier,
      completedAt: event.timestamp.toISOString(),
      completedByOsrsAccountId: osrsAccountId
    });
  }
  
  const progressMetadata: SpeedrunProgressMetadata = {
    requirementType: BingoTileRequirementType.SPEEDRUN,
    targetValue: requirement.goalSeconds,
    lastUpdateAt: event.timestamp.toISOString(),
    currentBestTimeSeconds: currentBestTime,
    goalSeconds: requirement.goalSeconds,
    playerContributions,
    completedTiers: completedTiers.length > 0 ? completedTiers : undefined,
    currentTier: completedTiers.length > 0 ? Math.max(...completedTiers.map(t => t.tier)) : undefined
  };
  
  return {
    progressValue: currentBestTime,
    progressMetadata,
    isCompleted: completedTiers.length > 0,
    completedTiers: tierJustCompleted ? completedTiers : undefined
  };
};

/**
 * Get or initialize player contributions array.
 */
const getOrInitPlayerContributions = (
  existingMetadata: SpeedrunProgressMetadata | undefined,
  osrsAccountId?: number,
  playerName?: string,
  memberId?: number,
  initialTime?: number
): SpeedrunPlayerContribution[] => {
  const contributions: SpeedrunPlayerContribution[] = 
    existingMetadata?.playerContributions ? [...existingMetadata.playerContributions] : [];
  
  // Create new player contribution if needed
  if (osrsAccountId && playerName && !contributions.find(p => p.osrsAccountId === osrsAccountId)) {
    contributions.push({
      osrsAccountId,
      osrsNickname: playerName,
      memberId,
      bestTimeSeconds: initialTime ?? Infinity,
      attempts: []
    });
  }
  
  return contributions;
};

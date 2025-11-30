/**
 * Barbarian Assault Gambles Progress Calculator
 * 
 * Tracks team progress toward a target number of BA high gambles.
 * Each player's gamble sessions are tracked individually, then
 * summed for the team total.
 * 
 * Completion: Team total gambles >= required amount
 */

import type { UnifiedGameEvent } from '../types/unified-event.type.js';
import type {
  BaGamblesRequirement,
  BaGamblesProgressMetadata,
  BaGamblesPlayerContribution,
  ProgressResult,
  ExistingProgress
} from '../types/bingo-requirements.type.js';
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';

/**
 * BA gambles event data structure
 */
interface BaGamblesEventData {
  gambleCount?: number;
}

/**
 * Calculate BA gambles progress for a team.
 * 
 * Logic:
 * 1. Extract gamble count from event (defaults to 1 if not specified)
 * 2. Find or create player's contribution record
 * 3. Add this gamble session to player's history
 * 4. Sum all player contributions for team total
 * 5. Compare against target to determine completion
 * 
 * @param event - The unified game event containing BA gamble data
 * @param requirement - The BA gambles requirement (target amount)
 * @param existing - Existing progress from database, or null if first event
 * @param memberId - Discord member ID (optional)
 * @param osrsAccountId - OSRS account ID (required for tracking)
 * @param playerName - Player's OSRS name (required for display)
 * @returns Progress result with new values and completion status
 */
export const calculateBaGamblesProgress = (
  event: UnifiedGameEvent,
  requirement: BaGamblesRequirement,
  existing: ExistingProgress | null,
  memberId?: number,
  osrsAccountId?: number,
  playerName?: string
): ProgressResult => {
  const baData = event.data as BaGamblesEventData;
  const gambleCount = baData.gambleCount ?? 1;
  
  // Get existing metadata or create new
  const existingMetadata = existing?.progressMetadata as BaGamblesProgressMetadata | undefined;
  
  // Get or initialize player contributions
  const playerContributions: BaGamblesPlayerContribution[] = 
    existingMetadata?.playerContributions ? [...existingMetadata.playerContributions] : [];
  
  // Find or create current player's contribution
  let playerContribution = playerContributions.find(p => p.osrsAccountId === osrsAccountId);
  
  if (!playerContribution && osrsAccountId && playerName) {
    playerContribution = {
      osrsAccountId,
      osrsNickname: playerName,
      memberId,
      gambleContribution: 0,
      gambleSessions: []
    };
    playerContributions.push(playerContribution);
  }
  
  // Record this gamble session
  if (playerContribution) {
    playerContribution.gambleSessions.push({
      count: gambleCount,
      timestamp: event.timestamp.toISOString()
    });
    playerContribution.gambleContribution += gambleCount;
  }
  
  // Calculate team total
  const currentTotal = playerContributions.reduce(
    (sum, p) => sum + p.gambleContribution, 
    0
  );
  
  const progressMetadata: BaGamblesProgressMetadata = {
    requirementType: BingoTileRequirementType.BA_GAMBLES,
    targetValue: requirement.amount,
    lastUpdateAt: event.timestamp.toISOString(),
    currentTotalGambles: currentTotal,
    playerContributions,
    completedTiers: existingMetadata?.completedTiers,
    currentTier: existingMetadata?.currentTier
  };
  
  return {
    progressValue: currentTotal,
    progressMetadata,
    isCompleted: currentTotal >= requirement.amount
  };
};

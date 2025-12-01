/**
 * Chat Progress Calculator
 * 
 * Tracks team progress toward receiving specific chat messages.
 * Used for tracking game messages like quest completions, achievement notifications, etc.
 * 
 * Each player's matching messages are tracked individually, then counted for team progress.
 */

import type { UnifiedGameEvent, ChatEventData } from '../types/unified-event.type.js';
import type {
  ChatRequirement,
  ChatProgressMetadata,
  ChatPlayerContribution,
  ProgressResult,
  ExistingProgress
} from '../types/bingo-requirements.type.js';
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';

/**
 * Calculate chat message progress for a team.
 * 
 * Logic:
 * 1. Verify the message matches the requirement (already done by matcher)
 * 2. Find or create player's contribution record
 * 3. Add the message to player's tracked messages
 * 4. Update player's count
 * 5. Calculate team total count
 * 6. Determine completion based on target count
 * 
 * @param event - The unified game event containing chat data
 * @param requirement - The chat requirement (message pattern, count)
 * @param existing - Existing progress from database, or null if first event
 * @param memberId - Discord member ID (optional)
 * @param osrsAccountId - OSRS account ID (required for tracking)
 * @param playerName - Player's OSRS name (required for display)
 * @returns Progress result with new values and completion status
 */
export const calculateChatProgress = (
  event: UnifiedGameEvent,
  requirement: ChatRequirement,
  existing: ExistingProgress | null,
  memberId?: number,
  osrsAccountId?: number,
  playerName?: string
): ProgressResult => {
  const chatData = event.data as ChatEventData;
  
  // Get existing metadata or create new
  const existingMetadata = existing?.progressMetadata as ChatProgressMetadata | undefined;
  
  // Get or initialize player contributions
  const playerContributions: ChatPlayerContribution[] = 
    existingMetadata?.playerContributions ? [...existingMetadata.playerContributions] : [];
  
  // Find or create current player's contribution
  let playerContribution = playerContributions.find(p => p.osrsAccountId === osrsAccountId);
  
  if (!playerContribution && osrsAccountId && playerName) {
    playerContribution = {
      osrsAccountId,
      osrsNickname: playerName,
      memberId,
      messages: [],
      count: 0
    };
    playerContributions.push(playerContribution);
  }
  
  // Add this message to player's tracking
  if (playerContribution) {
    playerContribution.messages.push({
      message: chatData.message,
      messageType: chatData.messageType,
      timestamp: event.timestamp.toISOString()
    });
    playerContribution.count += 1;
  }
  
  // Calculate team total
  const totalCount = playerContributions.reduce((sum, p) => sum + p.count, 0);
  const targetCount = requirement.count ?? 1;
  
  const progressMetadata: ChatProgressMetadata = {
    requirementType: BingoTileRequirementType.CHAT,
    targetValue: targetCount,
    targetCount,
    lastUpdateAt: event.timestamp.toISOString(),
    currentTotalCount: totalCount,
    playerContributions,
    completedTiers: existingMetadata?.completedTiers,
    currentTier: existingMetadata?.currentTier
  };
  
  return {
    progressValue: totalCount,
    progressMetadata,
    isCompleted: totalCount >= targetCount
  };
};


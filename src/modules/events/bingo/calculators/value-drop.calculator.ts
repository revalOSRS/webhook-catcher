/**
 * Value Drop Progress Calculator
 * 
 * Tracks team progress toward obtaining a single high-value drop.
 * This checks if ANY single item in a drop meets or exceeds the target value.
 * It does NOT sum up multiple items - one item must be worth the full amount.
 * 
 * Example: If target is 10M, a single 10M+ item completes it.
 * Getting 5x 2M items does NOT complete it (no single item >= 10M).
 * 
 * Completion: Best single item value >= required value
 */

import type { UnifiedGameEvent } from '../types/unified-event.type.js';
import type {
  ValueDropRequirement,
  ValueDropProgressMetadata,
  ValueDropPlayerContribution,
  ProgressResult,
  ExistingProgress
} from '../types/bingo-requirements.type.js';
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';

/**
 * Loot item with price data
 */
interface LootItemWithPrice {
  id: number;
  name: string;
  quantity: number;
  priceEach?: number;
}

/**
 * Value drop event data structure
 */
interface ValueDropEventData {
  items: LootItemWithPrice[];
}

/**
 * Calculate value drop progress for a team.
 * 
 * Logic:
 * 1. Extract items from loot event
 * 2. Calculate total value of each item (priceEach * quantity)
 * 3. Find the highest value single item
 * 4. If it meets the requirement, add to player's qualifying drops
 * 5. Track the team's best single-item value
 * 6. Complete when any team member has obtained a qualifying item
 * 
 * Note: This is for "get a single drop worth X" requirements.
 * For total loot value requirements, use a different calculator.
 * 
 * @param event - The unified game event containing loot data with prices
 * @param requirement - The value drop requirement (target value)
 * @param existing - Existing progress from database, or null if first event
 * @param memberId - Discord member ID (optional)
 * @param osrsAccountId - OSRS account ID (required for tracking)
 * @param playerName - Player's OSRS name (required for display)
 * @returns Progress result with new values and completion status
 */
export const calculateValueDropProgress = (
  event: UnifiedGameEvent,
  requirement: ValueDropRequirement,
  existing: ExistingProgress | null,
  memberId?: number,
  osrsAccountId?: number,
  playerName?: string
): ProgressResult => {
  const lootData = event.data as ValueDropEventData;
  const items = lootData.items ?? [];
  
  // Get existing metadata or create new
  const existingMetadata = existing?.progressMetadata as ValueDropProgressMetadata | undefined;
  
  // Find the highest value single item in this drop
  let highestItemValue = 0;
  let highestItem: LootItemWithPrice | null = null;
  
  for (const item of items) {
    const itemValue = (item.priceEach ?? 0) * (item.quantity ?? 1);
    if (itemValue > highestItemValue) {
      highestItemValue = itemValue;
      highestItem = item;
    }
  }
  
  // Check if this drop qualifies
  const meetsRequirement = highestItemValue >= requirement.value;
  
  // Get or initialize player contributions
  const playerContributions: ValueDropPlayerContribution[] = 
    existingMetadata?.playerContributions ? [...existingMetadata.playerContributions] : [];
  
  // Find or create current player's contribution
  let playerContribution = playerContributions.find(p => p.osrsAccountId === osrsAccountId);
  
  if (!playerContribution && osrsAccountId && playerName) {
    playerContribution = {
      osrsAccountId,
      osrsNickname: playerName,
      memberId,
      bestValue: 0,
      qualifyingDrops: []
    };
    playerContributions.push(playerContribution);
  }
  
  // Record qualifying drop
  if (playerContribution && meetsRequirement && highestItem) {
    playerContribution.qualifyingDrops.push({
      itemId: highestItem.id,
      itemName: highestItem.name,
      value: highestItemValue,
      timestamp: event.timestamp.toISOString()
    });
    
    // Update personal best
    if (highestItemValue > playerContribution.bestValue) {
      playerContribution.bestValue = highestItemValue;
    }
  }
  
  // Calculate team's best value
  const currentBestValue = playerContributions.length > 0
    ? Math.max(...playerContributions.map(p => p.bestValue))
    : 0;
  
  const progressMetadata: ValueDropProgressMetadata = {
    requirementType: BingoTileRequirementType.VALUE_DROP,
    targetValue: requirement.value,
    lastUpdateAt: event.timestamp.toISOString(),
    currentBestValue,
    playerContributions,
    completedTiers: existingMetadata?.completedTiers,
    currentTier: existingMetadata?.currentTier
  };
  
  return {
    progressValue: currentBestValue,
    progressMetadata,
    isCompleted: currentBestValue >= requirement.value
  };
};

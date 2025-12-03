/**
 * Item Drop Progress Calculator
 * 
 * Tracks team progress toward obtaining specific items from drops.
 * Supports two modes:
 * 1. Total amount mode: Count total items matching any required item
 * 2. Per-item mode: Each specific item must reach its individual target
 * 
 * Each player's item drops are tracked individually, then summed for team progress.
 */

import type { UnifiedGameEvent } from '../types/unified-event.type.js';
import type {
  ItemDropRequirement,
  ItemDropProgressMetadata,
  ItemDropPlayerContribution,
  ProgressResult,
  ExistingProgress
} from '../types/bingo-requirements.type.js';
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';

/**
 * Loot item from event data
 */
interface LootItem {
  id: number;
  name: string;
  quantity: number;
}

/**
 * Item drop event data structure
 */
interface ItemDropEventData {
  items: LootItem[];
}

/**
 * Calculate item drop progress for a team.
 * 
 * Logic:
 * 1. Extract items from loot event
 * 2. Find or create player's contribution record
 * 3. For each required item found in the drop:
 *    - Add quantity to player's item tracking
 *    - Update player's total count
 * 4. Calculate team totals based on mode:
 *    - Total amount mode: Sum all matching items across team
 *    - Per-item mode: Check each item meets its individual target
 * 5. Determine completion based on mode
 * 
 * @param event - The unified game event containing loot data
 * @param requirement - The item drop requirement (items list, amounts)
 * @param existing - Existing progress from database, or null if first event
 * @param memberId - Discord member ID (optional)
 * @param osrsAccountId - OSRS account ID (required for tracking)
 * @param playerName - Player's OSRS name (required for display)
 * @returns Progress result with new values and completion status
 */
export const calculateItemDropProgress = (
  event: UnifiedGameEvent,
  requirement: ItemDropRequirement,
  existing: ExistingProgress | null,
  memberId?: number,
  osrsAccountId?: number,
  playerName?: string
): ProgressResult => {
  const lootData = event.data as ItemDropEventData;
  const itemsObtained: Array<{ itemId: number; itemName: string; quantity: number }> = [];
  
  // Get existing metadata or create new
  const existingMetadata = existing?.progressMetadata as ItemDropProgressMetadata | undefined;
  
  // Get or initialize player contributions
  const playerContributions: ItemDropPlayerContribution[] = 
    existingMetadata?.playerContributions ? [...existingMetadata.playerContributions] : [];
  
  // Find or create current player's contribution
  let playerContribution = playerContributions.find(p => p.osrsAccountId === osrsAccountId);
  
  if (!playerContribution && osrsAccountId && playerName) {
    playerContribution = {
      osrsAccountId,
      osrsNickname: playerName,
      memberId,
      items: [],
      totalCount: 0
    };
    playerContributions.push(playerContribution);
  }
  
  // Process each required item from this event
  for (const reqItem of requirement.items) {
    const foundItem = lootData.items.find(item => item.id === reqItem.itemId);
    
    if (foundItem && playerContribution) {
      // Update player's item tracking
      const existingItem = playerContribution.items.find(i => i.itemId === reqItem.itemId);
      
      if (existingItem) {
        existingItem.quantity += foundItem.quantity;
      } else {
        playerContribution.items.push({
          itemId: foundItem.id,
          itemName: foundItem.name,
          quantity: foundItem.quantity
        });
      }
      
      playerContribution.totalCount += foundItem.quantity;
      itemsObtained.push({
        itemId: foundItem.id,
        itemName: foundItem.name,
        quantity: foundItem.quantity
      });
    }
  }
  
  // Calculate team-wide totals and determine completion
  const { progressValue, targetValue, isCompleted } = calculateCompletion(
    playerContributions, 
    requirement
  );
  
  const progressMetadata: ItemDropProgressMetadata = {
    requirementType: BingoTileRequirementType.ITEM_DROP,
    targetValue,
    lastUpdateAt: event.timestamp.toISOString(),
    currentTotalCount: progressValue,
    playerContributions,
    lastItemsObtained: itemsObtained.length > 0 ? itemsObtained : existingMetadata?.lastItemsObtained,
    completedTiers: existingMetadata?.completedTiers,
    currentTier: existingMetadata?.currentTier
  };
  
  return {
    progressValue,
    progressMetadata,
    isCompleted
  };
};

/**
 * Calculate completion based on requirement mode.
 * 
 * Two modes:
 * 1. totalAmount mode: Count UNIQUE items obtained from the list
 *    Example: items [A, B, C] with totalAmount: 2 = need any 2 different items
 * 
 * 2. Per-item mode: Each specific item must reach its individual itemAmount target
 *    Example: items [{A, amount: 5}, {B, amount: 3}] = need 5 of A AND 3 of B
 * 
 * @param contributions - All player contributions
 * @param requirement - The item drop requirement
 * @returns Progress value, target, and completion status
 */
const calculateCompletion = (
  contributions: ItemDropPlayerContribution[],
  requirement: ItemDropRequirement
): { progressValue: number; targetValue: number; isCompleted: boolean } => {
  // Aggregate all items across players
  const itemTotals: Record<number, number> = {};
  
  for (const player of contributions) {
    for (const item of player.items) {
      itemTotals[item.itemId] = (itemTotals[item.itemId] ?? 0) + item.quantity;
    }
  }
  
  // Total amount mode: count UNIQUE items obtained (not total quantity)
  // Example: items [Cowhide, Raw beef, Hammer] with totalAmount: 2
  // = need to obtain any 2 different items from the list
  if (requirement.totalAmount !== undefined) {
    // Count how many unique required items have been obtained (at least 1 of each)
    let uniqueItemsObtained = 0;
    for (const reqItem of requirement.items) {
      const currentAmount = itemTotals[reqItem.itemId] ?? 0;
      const requiredAmount = reqItem.itemAmount ?? 1;
      if (currentAmount >= requiredAmount) {
        uniqueItemsObtained++;
      }
    }
    
    return {
      progressValue: uniqueItemsObtained,
      targetValue: requirement.totalAmount,
      isCompleted: uniqueItemsObtained >= requirement.totalAmount
    };
  }
  
  // Per-item mode: each item must meet its individual target
  let allItemsComplete = true;
  let completedItems = 0;
  const totalItems = requirement.items.length;
  
  for (const reqItem of requirement.items) {
    const requiredAmount = reqItem.itemAmount ?? 1;
    const currentAmount = itemTotals[reqItem.itemId] ?? 0;
    
    if (currentAmount >= requiredAmount) {
      completedItems++;
    } else {
      allItemsComplete = false;
    }
  }
  
  return {
    progressValue: completedItems,
    targetValue: totalItems,
    isCompleted: allItemsComplete
  };
};

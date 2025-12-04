/**
 * Requirement Matcher
 * Checks if a unified game event matches a tile requirement
 */

import type { UnifiedGameEvent, LootEventData, PetEventData, SpeedrunEventData, BaGambleEventData, ChatEventData } from '../types/unified-event.type.js'
import { UnifiedEventType } from '../types/unified-event.type.js'
import type { 
  ItemDropRequirement,
  PetRequirement,
  ValueDropRequirement,
  SpeedrunRequirement,
  ExperienceRequirement,
  BaGamblesRequirement,
  ChatRequirement,
  PuzzleRequirement,
  BingoTileRequirements,
  SimplifiedBingoTileRequirement
} from '../types/bingo-requirements.type.js';
import { BingoTileMatchType, BingoTileRequirementType, ALLOWED_CHAT_SOURCES } from '../types/bingo-requirements.type.js';

/**
 * Checks if an event matches tile requirements.
 * 
 * Supports tiles with both base requirements AND tiers:
 * 
 * 1. Tiered requirements: Returns true if event matches ANY tier's requirement.
 *    This allows progressive completion where reaching any tier counts as a match.
 * 
 * 2. Regular requirements: Uses `matchType` to determine logic:
 *    - ALL: Every requirement in the array must be satisfied by the event
 *    - ANY: At least one requirement must be satisfied by the event
 * 
 * When BOTH tiers and requirements exist, the event can match EITHER:
 * - Any tier's requirement, OR
 * - The base requirements
 * 
 * This allows tiles like "Collect different bones" where base bones and tier bones
 * are all tracked separately.
 * 
 * Returns false if no requirements are defined.
 */
export const matchesRequirement = (event: UnifiedGameEvent, requirements: BingoTileRequirements): boolean => {
  let matchesTier = false;
  let matchesBase = false;

  // Check tiers if they exist
  if (requirements.tiers && requirements.tiers.length > 0) {
    matchesTier = requirements.tiers.some(tier => 
      matchesSimplifiedRequirement(event, tier.requirement)
    );
  }

  // Check base requirements if they exist
  if (requirements.requirements && requirements.requirements.length > 0) {
    if (requirements.matchType === BingoTileMatchType.ALL) {
      // For ALL mode with tiers, check if ANY base requirement matches
      // (since tiers are separate track, we want to track any matching base requirement)
      matchesBase = requirements.requirements.some(req => 
        matchesSimplifiedRequirement(event, req)
      );
    } else {
      // ANY requirement must match
      matchesBase = requirements.requirements.some(req => 
        matchesSimplifiedRequirement(event, req)
      );
    }
  }

  // Return true if event matches either tiers OR base requirements
  return matchesTier || matchesBase;
}

/**
 * Routes an event to the appropriate type-specific matcher based on requirement type.
 * 
 * Dispatches to:
 * - ITEM_DROP → matchesItemDrop
 * - PET → matchesPet
 * - VALUE_DROP → matchesValueDrop
 * - SPEEDRUN → matchesSpeedrun
 * - EXPERIENCE → matchesExperience
 * - BA_GAMBLES → matchesBaGambles
 * - CHAT → matchesChat
 * - PUZZLE → matchesPuzzle (delegates to hidden requirement)
 * 
 * Returns false for unknown requirement types.
 */
const matchesSimplifiedRequirement = (event: UnifiedGameEvent, requirement: SimplifiedBingoTileRequirement): boolean => {
  switch (requirement.type) {
    case BingoTileRequirementType.ITEM_DROP:
      return matchesItemDrop(event, requirement)
    case BingoTileRequirementType.PET:
      return matchesPet(event, requirement)
    case BingoTileRequirementType.VALUE_DROP:
      return matchesValueDrop(event, requirement)
    case BingoTileRequirementType.SPEEDRUN:
      return matchesSpeedrun(event, requirement)
    case BingoTileRequirementType.EXPERIENCE:
      return matchesExperience(event, requirement)
    case BingoTileRequirementType.BA_GAMBLES:
      return matchesBaGambles(event, requirement)
    case BingoTileRequirementType.CHAT:
      return matchesChat(event, requirement)
    case BingoTileRequirementType.PUZZLE:
      return matchesPuzzle(event, requirement)
    default:
      return false
  }
}

/**
 * Checks if a loot event contains required item drops.
 * 
 * For BOTH modes (totalAmount or per-item):
 * Returns true if ANY required item is found in the event.
 * The calculator handles accumulating progress and determining completion.
 * 
 * This allows cumulative progress tracking - players can get items one at a time
 * across multiple events, and the calculator sums them up.
 * 
 * Returns false if event is not a LOOT event or no required items are present.
 */
const matchesItemDrop = (event: UnifiedGameEvent, requirement: ItemDropRequirement): boolean => {
  if (event.eventType !== UnifiedEventType.LOOT) return false
  
  const lootData = event.data as LootEventData
  
  // Check if at least one required item is present in this event
  // Progress accumulation and completion check happens in the calculator
  for (const reqItem of requirement.items) {
    const found = lootData.items.find(item => item.id === reqItem.itemId)
    if (found) {
      return true // At least one matching item found
    }
  }
  
  return false
}

/**
 * Checks if a pet event matches the required pet name.
 * 
 * Performs a case-insensitive comparison between the received pet name
 * and the required pet name.
 * 
 * Returns false if event is not a PET event.
 */
const matchesPet = (event: UnifiedGameEvent, requirement: PetRequirement): boolean => {
  if (event.eventType !== UnifiedEventType.PET) return false
  
  const petData = event.data as PetEventData
  return petData.petName.toLowerCase() === requirement.petName.toLowerCase()
}

/**
 * Checks if any single item in a loot event meets the minimum value threshold.
 * 
 * Calculates each item's total value as (priceEach × quantity) and checks
 * if ANY single item's value >= the required value.
 * 
 * Important: This checks individual item values, NOT the combined total
 * of all items in the drop.
 * 
 * Returns false if event is not a LOOT event.
 */
const matchesValueDrop = (event: UnifiedGameEvent, requirement: ValueDropRequirement): boolean => {
  if (event.eventType !== UnifiedEventType.LOOT) return false
  
  const lootData = event.data as LootEventData
  const items = lootData.items || []
  
  // Check if any single item (priceEach * quantity) is worth >= the required value
  // Not the total value of all items combined
  return items.some(item => {
    const itemValue = (item.priceEach || 0) * (item.quantity || 1)
    return itemValue >= requirement.value
  })
}

/**
 * Checks if a speedrun event beats the required time at the specified location.
 * 
 * First verifies the location matches (case-insensitive), then checks if
 * the completion time is less than or equal to the goal time.
 * 
 * For speedruns, lower time = better, so we check timeSeconds <= goalSeconds.
 * 
 * Returns false if event is not a SPEEDRUN event or location doesn't match.
 */
const matchesSpeedrun = (event: UnifiedGameEvent, requirement: SpeedrunRequirement): boolean => {
  if (event.eventType !== UnifiedEventType.SPEEDRUN) return false
  
  const speedrunData = event.data as SpeedrunEventData
  
  // Check location matches
  if (speedrunData.location.toLowerCase() !== requirement.location.toLowerCase()) {
    return false
  }
  
  // Check if time is better than goal (lower is better for speedruns)
  return speedrunData.timeSeconds <= requirement.goalSeconds
}

/**
 * Checks if an event should trigger experience progress tracking.
 * 
 * Experience gains are validated using LOGIN snapshots captured by Dink.
 * 
 * LOGIN events are the primary trigger because:
 * - Dink sends current skill XP on every LOGIN
 * - The snapshot service captures baseline on first login after event start
 * - Subsequent logins update current XP and trigger progress calculation
 * 
 * LOGOUT is also included for backwards compatibility.
 */
const matchesExperience = (event: UnifiedGameEvent, _requirement: ExperienceRequirement): boolean => {
  // LOGIN events carry current XP data that updates the snapshot and triggers progress
  // LOGOUT is kept for backwards compatibility
  return event.eventType === UnifiedEventType.LOGIN || event.eventType === UnifiedEventType.LOGOUT
}

/**
 * Checks if a Barbarian Assault gamble event meets the required gamble count.
 * 
 * Compares the gamble count from the event against the required amount.
 * Returns true if gambleCount >= required amount.
 * 
 * Returns false if event is not a BA_GAMBLE event.
 */
const matchesBaGambles = (event: UnifiedGameEvent, requirement: BaGamblesRequirement): boolean => {
  if (event.eventType !== UnifiedEventType.BA_GAMBLE) return false
  
  const baData = event.data as BaGambleEventData
  return baData.gambleCount >= requirement.amount
}

/**
 * Checks if a chat event matches the required message pattern.
 * 
 * Matching logic:
 * 1. First checks if the chat source is allowed (GAMEMESSAGE or ENGINE only)
 *    This prevents tracking player chat messages, only game-generated messages.
 * 2. If source is specified in requirement, checks if it matches
 * 3. Checks if the message type matches (if specified)
 * 4. Then checks if the message content matches:
 *    - If exactMatch is true: message must equal the requirement exactly (case-insensitive)
 *    - If exactMatch is false (default): message must contain the requirement (case-insensitive)
 * 
 * Examples:
 * - Message "You've completed Monkey Madness!" matches requirement "completed Monkey Madness"
 * - With exactMatch: true, "hello" only matches "hello", not "hello world"
 * 
 * Returns false if event is not a CHAT event or if source is not allowed.
 */
const matchesChat = (event: UnifiedGameEvent, requirement: ChatRequirement): boolean => {
  if (event.eventType !== UnifiedEventType.CHAT) return false
  
  const chatData = event.data as ChatEventData
  
  // Only allow GAMEMESSAGE and ENGINE sources (no player chat)
  const eventSource = chatData.source?.toUpperCase()
  if (!eventSource || !ALLOWED_CHAT_SOURCES.includes(eventSource as typeof ALLOWED_CHAT_SOURCES[number])) {
    return false
  }
  
  // Check specific source if specified in requirement
  if (requirement.source) {
    if (eventSource !== requirement.source.toUpperCase()) {
      return false
    }
  }
  
  // Check message type if specified
  if (requirement.messageType) {
    if (chatData.messageType.toUpperCase() !== requirement.messageType.toUpperCase()) {
      return false
    }
  }
  
  // Check message content
  const eventMessage = chatData.message.toLowerCase()
  const requiredMessage = requirement.message.toLowerCase()
  
  if (requirement.exactMatch) {
    return eventMessage === requiredMessage
  } else {
    return eventMessage.includes(requiredMessage)
  }
}

/**
 * Checks if a puzzle's hidden requirement matches the event.
 * 
 * A puzzle is a wrapper around another requirement type that hides
 * the actual tracking logic from users. This matcher simply delegates
 * to the hidden requirement's matcher.
 * 
 * The hidden requirement can be any requirement type except PUZZLE
 * (no nested puzzles allowed).
 * 
 * @param event - The unified game event
 * @param requirement - The puzzle requirement containing the hidden requirement
 * @returns true if the event matches the hidden requirement
 */
const matchesPuzzle = (event: UnifiedGameEvent, requirement: PuzzleRequirement): boolean => {
  // Delegate to the hidden requirement's matcher
  return matchesSimplifiedRequirement(event, requirement.hiddenRequirement)
}

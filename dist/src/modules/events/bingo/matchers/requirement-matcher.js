/**
 * Requirement Matcher
 * Checks if a unified game event matches a tile requirement
 */
import { UnifiedEventType } from '../types/unified-event.type.js';
import { BingoTileMatchType, BingoTileRequirementType } from '../types/bingo-requirements.type.js';
/**
 * Checks if an event matches tile requirements.
 *
 * Two modes are supported:
 * 1. Tiered requirements: If `tiers` array exists, returns true if event matches ANY tier's requirement.
 *    This allows progressive completion where reaching any tier counts as a match.
 *
 * 2. Regular requirements: Uses `matchType` to determine logic:
 *    - ALL: Every requirement in the array must be satisfied by the event
 *    - ANY: At least one requirement must be satisfied by the event
 *
 * Returns false if no requirements are defined.
 */
export const matchesRequirement = (event, requirements) => {
    // If using tiers, check each tier
    if (requirements.tiers && requirements.tiers.length > 0) {
        // For tiered requirements, we check if event matches ANY tier
        // (tiles are marked complete when any tier is met)
        return requirements.tiers.some(tier => matchesSimplifiedRequirement(event, tier.requirement));
    }
    // If using regular requirements, check based on match_type
    if (requirements.requirements && requirements.requirements.length > 0) {
        if (requirements.matchType === BingoTileMatchType.ALL) {
            // ALL requirements must match
            return requirements.requirements.every(req => matchesSimplifiedRequirement(event, req));
        }
        else {
            // ANY requirement must match
            return requirements.requirements.some(req => matchesSimplifiedRequirement(event, req));
        }
    }
    return false;
};
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
 *
 * Returns false for unknown requirement types.
 */
const matchesSimplifiedRequirement = (event, requirement) => {
    switch (requirement.type) {
        case BingoTileRequirementType.ITEM_DROP:
            return matchesItemDrop(event, requirement);
        case BingoTileRequirementType.PET:
            return matchesPet(event, requirement);
        case BingoTileRequirementType.VALUE_DROP:
            return matchesValueDrop(event, requirement);
        case BingoTileRequirementType.SPEEDRUN:
            return matchesSpeedrun(event, requirement);
        case BingoTileRequirementType.EXPERIENCE:
            return matchesExperience(event, requirement);
        case BingoTileRequirementType.BA_GAMBLES:
            return matchesBaGambles(event, requirement);
        default:
            return false;
    }
};
/**
 * Checks if a loot event contains required item drops.
 *
 * Two modes based on whether `totalAmount` is defined:
 *
 * 1. Total amount mode (totalAmount provided):
 *    Sums up quantities of ALL matching items from the event.
 *    Returns true if the total >= totalAmount.
 *    Example: Items A, B, C with totalAmount: 5 → getting 2 of A and 3 of B = 5 total = match
 *
 * 2. Per-item mode (totalAmount NOT provided):
 *    Returns true if ANY required item is found in the event.
 *    Full completion tracking (checking each item meets its itemAmount) is handled
 *    by the calculator based on accumulated progress, not here.
 *
 * Returns false if event is not a LOOT event.
 */
const matchesItemDrop = (event, requirement) => {
    if (event.eventType !== UnifiedEventType.LOOT)
        return false;
    const lootData = event.data;
    if (requirement.totalAmount !== undefined) {
        // Total amount mode: check if total matching items >= totalAmount
        let totalFound = 0;
        for (const reqItem of requirement.items) {
            const found = lootData.items.find(item => item.id === reqItem.itemId);
            if (found) {
                totalFound += found.quantity;
            }
        }
        return totalFound >= requirement.totalAmount;
    }
    else {
        // Per-item mode: check if at least one required item is present in this event
        // (Full completion check happens in the calculator based on accumulated progress)
        for (const reqItem of requirement.items) {
            const found = lootData.items.find(item => item.id === reqItem.itemId);
            if (found) {
                return true; // At least one matching item found
            }
        }
        return false;
    }
};
/**
 * Checks if a pet event matches the required pet name.
 *
 * Performs a case-insensitive comparison between the received pet name
 * and the required pet name.
 *
 * Returns false if event is not a PET event.
 */
const matchesPet = (event, requirement) => {
    if (event.eventType !== UnifiedEventType.PET)
        return false;
    const petData = event.data;
    return petData.petName.toLowerCase() === requirement.petName.toLowerCase();
};
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
const matchesValueDrop = (event, requirement) => {
    if (event.eventType !== UnifiedEventType.LOOT)
        return false;
    const lootData = event.data;
    const items = lootData.items || [];
    // Check if any single item (priceEach * quantity) is worth >= the required value
    // Not the total value of all items combined
    return items.some(item => {
        const itemValue = (item.priceEach || 0) * (item.quantity || 1);
        return itemValue >= requirement.value;
    });
};
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
const matchesSpeedrun = (event, requirement) => {
    if (event.eventType !== UnifiedEventType.SPEEDRUN)
        return false;
    const speedrunData = event.data;
    // Check location matches
    if (speedrunData.location.toLowerCase() !== requirement.location.toLowerCase()) {
        return false;
    }
    // Check if time is better than goal (lower is better for speedruns)
    return speedrunData.timeSeconds <= requirement.goalSeconds;
};
/**
 * Checks if an event should trigger experience progress tracking.
 *
 * Experience gains are validated against WiseOldMan API data, not the event itself.
 * This matcher only checks if the event type is LOGOUT, which triggers
 * the experience calculation in the progress calculator.
 *
 * The actual XP validation (checking if player gained required XP in the skill)
 * is handled by the calculator fetching data from WiseOldMan.
 */
const matchesExperience = (event, _requirement) => {
    // Experience is checked on LOGOUT, but we need to fetch from WiseOldMan
    // This will be handled in the progress calculator, not here
    // For now, just check event type
    return event.eventType === UnifiedEventType.LOGOUT;
};
/**
 * Checks if a Barbarian Assault gamble event meets the required gamble count.
 *
 * Compares the gamble count from the event against the required amount.
 * Returns true if gambleCount >= required amount.
 *
 * Returns false if event is not a BA_GAMBLE event.
 */
const matchesBaGambles = (event, requirement) => {
    if (event.eventType !== UnifiedEventType.BA_GAMBLE)
        return false;
    const baData = event.data;
    return baData.gambleCount >= requirement.amount;
};

/**
 * Requirement Matcher
 * Checks if a unified game event matches a tile requirement
 */
/**
 * Check if an event matches tile requirements
 */
export function matchesRequirement(event, requirements) {
    // If using tiers, check each tier
    if (requirements.tiers && requirements.tiers.length > 0) {
        // For tiered requirements, we check if event matches ANY tier
        // (tiles are marked complete when any tier is met)
        return requirements.tiers.some(tier => matchesSimplifiedRequirement(event, tier.requirement));
    }
    // If using regular requirements, check based on match_type
    if (requirements.requirements && requirements.requirements.length > 0) {
        if (requirements.match_type === 'all') {
            // ALL requirements must match
            return requirements.requirements.every(req => matchesSimplifiedRequirement(event, req));
        }
        else {
            // ANY requirement must match
            return requirements.requirements.some(req => matchesSimplifiedRequirement(event, req));
        }
    }
    return false;
}
/**
 * Check if an event matches a simplified requirement
 */
function matchesSimplifiedRequirement(event, requirement) {
    switch (requirement.type) {
        case 'ITEM_DROP':
            return matchesItemDrop(event, requirement);
        case 'PET':
            return matchesPet(event, requirement);
        case 'VALUE_DROP':
            return matchesValueDrop(event, requirement);
        case 'SPEEDRUN':
            return matchesSpeedrun(event, requirement);
        case 'EXPERIENCE':
            return matchesExperience(event, requirement);
        case 'BA_GAMBLES':
            return matchesBaGambles(event, requirement);
        default:
            return false;
    }
}
function matchesItemDrop(event, requirement) {
    if (event.eventType !== 'LOOT')
        return false;
    const lootData = event.data; // LootEventData
    // Single item format
    if (requirement.item_id !== undefined) {
        return lootData.items.some((item) => item.id === requirement.item_id && item.quantity >= (requirement.item_amount || 1));
    }
    // Multiple items format
    if (requirement.items && requirement.total_amount) {
        let totalFound = 0;
        for (const reqItem of requirement.items) {
            const found = lootData.items.find((item) => item.id === reqItem.item_id);
            if (found) {
                totalFound += found.quantity;
            }
        }
        return totalFound >= requirement.total_amount;
    }
    return false;
}
function matchesPet(event, requirement) {
    if (event.eventType !== 'PET')
        return false;
    const petData = event.data; // PetEventData
    return petData.petName.toLowerCase() === requirement.pet_name.toLowerCase();
}
function matchesValueDrop(event, requirement) {
    if (event.eventType !== 'LOOT')
        return false;
    const lootData = event.data; // LootEventData
    return (lootData.totalValue || 0) >= requirement.value;
}
function matchesSpeedrun(event, requirement) {
    if (event.eventType !== 'SPEEDRUN')
        return false;
    const speedrunData = event.data; // SpeedrunEventData
    // Check location matches
    if (speedrunData.location.toLowerCase() !== requirement.location.toLowerCase()) {
        return false;
    }
    // Check if time is better than goal (lower is better for speedruns)
    return speedrunData.timeSeconds <= requirement.goal_seconds;
}
function matchesExperience(event, requirement) {
    // Experience is checked on LOGOUT, but we need to fetch from WiseOldMan
    // This will be handled in the progress calculator, not here
    // For now, just check event type
    return event.eventType === 'LOGOUT';
}
function matchesBaGambles(event, requirement) {
    if (event.eventType !== 'BA_GAMBLE')
        return false;
    const baData = event.data; // BaGambleEventData
    return baData.gambleCount >= requirement.amount;
}

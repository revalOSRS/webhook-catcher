/**
 * Requirement Matcher
 * Checks if a unified game event matches a tile requirement
 */

import type { UnifiedGameEvent } from '../types/unified-event.types.js'
import type { 
  TileRequirements, 
  SimplifiedRequirement,
  ItemDropRequirement,
  PetRequirement,
  ValueDropRequirement,
  SpeedrunRequirement,
  ExperienceRequirement,
  BaGamblesRequirement
} from '../../../../types/bingo-requirements.js'

/**
 * Check if an event matches tile requirements
 */
export function matchesRequirement(event: UnifiedGameEvent, requirements: TileRequirements): boolean {
  // If using tiers, check each tier
  if (requirements.tiers && requirements.tiers.length > 0) {
    // For tiered requirements, we check if event matches ANY tier
    // (tiles are marked complete when any tier is met)
    return requirements.tiers.some(tier => 
      matchesSimplifiedRequirement(event, tier.requirement)
    )
  }

  // If using regular requirements, check based on match_type
  if (requirements.requirements && requirements.requirements.length > 0) {
    if (requirements.match_type === 'all') {
      // ALL requirements must match
      return requirements.requirements.every(req => 
        matchesSimplifiedRequirement(event, req)
      )
    } else {
      // ANY requirement must match
      return requirements.requirements.some(req => 
        matchesSimplifiedRequirement(event, req)
      )
    }
  }

  return false
}

/**
 * Check if an event matches a simplified requirement
 */
function matchesSimplifiedRequirement(event: UnifiedGameEvent, requirement: SimplifiedRequirement): boolean {
  switch (requirement.type) {
    case 'ITEM_DROP':
      return matchesItemDrop(event, requirement)
    case 'PET':
      return matchesPet(event, requirement)
    case 'VALUE_DROP':
      return matchesValueDrop(event, requirement)
    case 'SPEEDRUN':
      return matchesSpeedrun(event, requirement)
    case 'EXPERIENCE':
      return matchesExperience(event, requirement)
    case 'BA_GAMBLES':
      return matchesBaGambles(event, requirement)
    default:
      return false
  }
}

function matchesItemDrop(event: UnifiedGameEvent, requirement: ItemDropRequirement): boolean {
  if (event.eventType !== 'LOOT') return false
  
  const lootData = event.data as any // LootEventData
  
  // Debug logging
  console.log(`[RequirementMatcher] Checking ITEM_DROP: requirement.item_id=${requirement.item_id}, requirement.item_amount=${requirement.item_amount || 1}`)
  console.log(`[RequirementMatcher] Event items:`, JSON.stringify(lootData.items))
  
  // Single item format
  if (requirement.item_id !== undefined) {
    const matches = lootData.items.some((item: any) => {
      const itemMatches = item.id === requirement.item_id && item.quantity >= (requirement.item_amount || 1)
      console.log(`[RequirementMatcher] Checking item ${item.id} (qty ${item.quantity}): matches=${itemMatches}`)
      return itemMatches
    })
    console.log(`[RequirementMatcher] ITEM_DROP match result: ${matches}`)
    return matches
  }
  
  // Multiple items format
  if (requirement.items && requirement.total_amount) {
    let totalFound = 0
    for (const reqItem of requirement.items) {
      const found = lootData.items.find((item: any) => item.id === reqItem.item_id)
      if (found) {
        totalFound += found.quantity
      }
    }
    return totalFound >= requirement.total_amount
  }
  
  return false
}

function matchesPet(event: UnifiedGameEvent, requirement: PetRequirement): boolean {
  if (event.eventType !== 'PET') return false
  
  const petData = event.data as any // PetEventData
  return petData.petName.toLowerCase() === requirement.pet_name.toLowerCase()
}

function matchesValueDrop(event: UnifiedGameEvent, requirement: ValueDropRequirement): boolean {
  if (event.eventType !== 'LOOT') return false
  
  const lootData = event.data as any // LootEventData
  const items = lootData.items || []
  
  // Check if any single item (priceEach * quantity) is worth >= the required value
  // Not the total value of all items combined
  return items.some((item: any) => {
    const itemValue = (item.priceEach || 0) * (item.quantity || 1)
    return itemValue >= requirement.value
  })
}

function matchesSpeedrun(event: UnifiedGameEvent, requirement: SpeedrunRequirement): boolean {
  if (event.eventType !== 'SPEEDRUN') return false
  
  const speedrunData = event.data as any // SpeedrunEventData
  
  // Check location matches
  if (speedrunData.location.toLowerCase() !== requirement.location.toLowerCase()) {
    return false
  }
  
  // Check if time is better than goal (lower is better for speedruns)
  return speedrunData.timeSeconds <= requirement.goal_seconds
}

function matchesExperience(event: UnifiedGameEvent, requirement: ExperienceRequirement): boolean {
  // Experience is checked on LOGOUT, but we need to fetch from WiseOldMan
  // This will be handled in the progress calculator, not here
  // For now, just check event type
  return event.eventType === 'LOGOUT'
}

function matchesBaGambles(event: UnifiedGameEvent, requirement: BaGamblesRequirement): boolean {
  if (event.eventType !== 'BA_GAMBLE') return false
  
  const baData = event.data as any // BaGambleEventData
  return baData.gambleCount >= requirement.amount
}


import type { SimplifiedBingoTileRequirement, ItemDropRequirement, PetRequirement, ValueDropRequirement, SpeedrunRequirement, ExperienceRequirement, BaGamblesRequirement } from '../types/bingo-requirements.type.js';
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';

/**
 * Generates a stable, deterministic key for a requirement.
 * 
 * This key is used to match requirements even if they're reordered in the requirements array.
 * The key is based on the requirement's identifying fields, sorted and normalized
 * to ensure consistency.
 */
export const generateRequirementKey = (requirement: SimplifiedBingoTileRequirement): string => {
  switch (requirement.type) {
    case BingoTileRequirementType.ITEM_DROP: {
      const req = requirement as ItemDropRequirement
      // Sort items by itemId for consistency
      const sortedItems = [...req.items].sort((a, b) => a.itemId - b.itemId)
      const itemsKey = sortedItems
        .map(item => `${item.itemId}:${item.itemAmount ?? 1}`)
        .join(',')
      
      // Include totalAmount if present (changes the requirement meaning)
      if (req.totalAmount !== undefined) {
        return `ITEM_DROP:${itemsKey}:total=${req.totalAmount}`
      }
      return `ITEM_DROP:${itemsKey}`
    }

    case BingoTileRequirementType.PET: {
      const req = requirement as PetRequirement
      return `PET:${req.petName}:${req.amount}`
    }

    case BingoTileRequirementType.VALUE_DROP: {
      const req = requirement as ValueDropRequirement
      return `VALUE_DROP:${req.value}`
    }

    case BingoTileRequirementType.SPEEDRUN: {
      const req = requirement as SpeedrunRequirement
      return `SPEEDRUN:${req.location}:${req.goalSeconds}`
    }

    case BingoTileRequirementType.EXPERIENCE: {
      const req = requirement as ExperienceRequirement
      return `EXPERIENCE:${req.skill}:${req.experience}`
    }

    case BingoTileRequirementType.BA_GAMBLES: {
      const req = requirement as BaGamblesRequirement
      return `BA_GAMBLES:${req.amount}`
    }

    default: {
      // Fallback: use JSON stringification with sorted keys
      // This handles any unknown requirement types
      const normalized = JSON.stringify(requirement, Object.keys(requirement).sort())
      return `UNKNOWN:${normalized}`
    }
  }
}

/**
 * Finds a requirement progress entry by its key.
 */
export const findRequirementProgress = (
  requirementProgress: Array<{ requirementKey: string }>,
  requirement: SimplifiedBingoTileRequirement
): { requirementKey: string } | undefined => {
  const key = generateRequirementKey(requirement)
  return requirementProgress.find(rp => rp.requirementKey === key)
}


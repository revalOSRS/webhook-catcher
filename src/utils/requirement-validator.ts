/**
 * Requirement Validation System
 * Validates tile requirements to ensure they're properly structured
 */

import type {
  TileRequirements,
  ValidationResult,
  SimplifiedRequirement,
  ItemDropRequirement,
  PetRequirement,
  ValueDropRequirement,
  SpeedrunRequirement,
  TieredRequirement
} from '../types/bingo-requirements.js'

// ============================================================================
// Simplified Requirement Validation
// ============================================================================

/**
 * Main validation function - validates the simplified requirement structure
 */
export function validateRequirement(requirement: any): ValidationResult {
  try {
    // Check if it's the new simplified format
    if (requirement && typeof requirement === 'object' && 'match_type' in requirement) {
      return validateSimplifiedRequirements(requirement as TileRequirements)
    }
    
    // If it doesn't match the new format, return error
    return {
      valid: false,
      errors: ['Invalid requirement format. Must use simplified format with match_type and requirements/tiers.']
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    }
  }
}

/**
 * Validate the simplified requirement structure
 */
export function validateSimplifiedRequirements(requirements: TileRequirements): ValidationResult {
  const errors: string[] = []

  // Validate match_type
  if (!requirements.match_type || !['all', 'any'].includes(requirements.match_type)) {
    errors.push('match_type must be "all" or "any"')
  }

  // Validate that either requirements or tiers is provided
  if (!requirements.requirements && !requirements.tiers) {
    errors.push('Either requirements or tiers must be provided')
  }

  // Validate requirements array (if provided)
  if (requirements.requirements) {
    if (!Array.isArray(requirements.requirements)) {
      errors.push('requirements must be an array')
    } else if (requirements.requirements.length === 0) {
      errors.push('requirements array cannot be empty')
    } else {
      requirements.requirements.forEach((req, index) => {
        const validation = validateSimplifiedRequirement(req)
        if (!validation.valid && validation.errors) {
          validation.errors.forEach(err => {
            errors.push(`requirements[${index}]: ${err}`)
          })
        }
      })
    }
  }

  // Validate tiers array (if provided)
  if (requirements.tiers) {
    if (!Array.isArray(requirements.tiers)) {
      errors.push('tiers must be an array')
    } else if (requirements.tiers.length === 0) {
      errors.push('tiers array cannot be empty')
    } else {
      requirements.tiers.forEach((tier, index) => {
        if (!tier.tier || typeof tier.tier !== 'number' || tier.tier < 1) {
          errors.push(`tiers[${index}].tier must be a positive number`)
        }
        const validation = validateSimplifiedRequirement(tier.requirement)
        if (!validation.valid && validation.errors) {
          validation.errors.forEach(err => {
            errors.push(`tiers[${index}].requirement: ${err}`)
          })
        }
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  }
}

/**
 * Validate a single simplified requirement
 */
function validateSimplifiedRequirement(requirement: SimplifiedRequirement): ValidationResult {
  const errors: string[] = []

  if (!requirement || typeof requirement !== 'object') {
    return { valid: false, errors: ['Requirement must be an object'] }
  }

  if (!requirement.type) {
    errors.push('Requirement must have a type field')
  } else {
    // Type-specific validation
    switch (requirement.type) {
      case 'ITEM_DROP':
        errors.push(...validateItemDropRequirement(requirement))
        break
      case 'PET':
        errors.push(...validatePetRequirement(requirement))
        break
      case 'VALUE_DROP':
        errors.push(...validateValueDropRequirement(requirement))
        break
      case 'SPEEDRUN':
        errors.push(...validateSpeedrunRequirement(requirement))
        break
      default:
        errors.push(`Unknown requirement type: ${(requirement as any).type}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  }
}

function validateItemDropRequirement(req: ItemDropRequirement): string[] {
  const errors: string[] = []

  if (!req.item_name || typeof req.item_name !== 'string') {
    errors.push('item_name is required and must be a string')
  }

  if (!req.item_id || typeof req.item_id !== 'number' || req.item_id < 0) {
    errors.push('item_id is required and must be a non-negative number')
  }

  if (!req.item_amount || typeof req.item_amount !== 'number' || req.item_amount < 1) {
    errors.push('item_amount is required and must be a positive number')
  }

  return errors
}

function validatePetRequirement(req: PetRequirement): string[] {
  const errors: string[] = []

  if (!req.pet_name || typeof req.pet_name !== 'string') {
    errors.push('pet_name is required and must be a string')
  }

  if (!req.amount || typeof req.amount !== 'number' || req.amount < 1) {
    errors.push('amount is required and must be a positive number')
  }

  return errors
}

function validateValueDropRequirement(req: ValueDropRequirement): string[] {
  const errors: string[] = []

  if (!req.value || typeof req.value !== 'number' || req.value < 1) {
    errors.push('value is required and must be a positive number')
  }

  return errors
}

function validateSpeedrunRequirement(req: SpeedrunRequirement): string[] {
  const errors: string[] = []

  if (!req.location || typeof req.location !== 'string') {
    errors.push('location is required and must be a string')
  }

  if (!req.goal_seconds || typeof req.goal_seconds !== 'number' || req.goal_seconds < 1) {
    errors.push('goal_seconds is required and must be a positive number')
  }

  return errors
}


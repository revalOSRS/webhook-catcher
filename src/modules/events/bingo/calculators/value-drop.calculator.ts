/**
 * Value Drop Progress Calculator
 * Checks if any single item in the drop is worth >= the required value
 * (Not the total value of all items combined)
 */

import type { UnifiedGameEvent } from '../types/unified-event.types.js'
import type { ValueDropRequirement } from '../../../../types/bingo-requirements.js'
import type { ProgressUpdate, ExistingProgress } from './progress-calculator.types.js'

export function calculateValueDropProgress(
  event: UnifiedGameEvent,
  requirement: ValueDropRequirement,
  existing: ExistingProgress | null
): ProgressUpdate {
  const lootData = event.data as any
  const items = lootData.items || []
  
  // Find the highest value single item (priceEach * quantity)
  let highestItemValue = 0
  let highestItem: any = null
  
  for (const item of items) {
    const itemValue = (item.priceEach || 0) * (item.quantity || 1)
    if (itemValue > highestItemValue) {
      highestItemValue = itemValue
      highestItem = item
    }
  }
  
  // Check if any single item meets or exceeds the required value
  const meetsRequirement = highestItemValue >= requirement.value
  
  // Track count of drops that meet the requirement
  const currentCount = existing?.progressValue || 0
  const newCount = meetsRequirement ? currentCount + 1 : currentCount
  const isCompleted = newCount >= 1 // Completed if we've gotten at least one qualifying drop

  return {
    progressValue: newCount,
    metadata: {
      ...existing?.metadata,
      current_count: newCount,
      target_value: requirement.value,
      last_update_at: event.timestamp.toISOString(),
      last_drop_highest_value: highestItemValue,
      last_drop_met_requirement: meetsRequirement,
      last_qualifying_item: meetsRequirement ? {
        name: highestItem?.name,
        id: highestItem?.id,
        quantity: highestItem?.quantity,
        priceEach: highestItem?.priceEach,
        totalValue: highestItemValue
      } : null
    },
    isCompleted
  }
}


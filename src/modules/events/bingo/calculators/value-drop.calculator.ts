/**
 * Value Drop Progress Calculator
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
  const dropValue = lootData.totalValue || 0
  
  const currentProgress = existing?.progressValue || 0
  const newProgress = currentProgress + dropValue
  const isCompleted = newProgress >= requirement.value

  return {
    progressValue: newProgress,
    metadata: {
      ...existing?.metadata,
      current_value: newProgress,
      target_value: requirement.value,
      last_update_at: event.timestamp.toISOString(),
      last_drop_value: dropValue
    },
    isCompleted
  }
}


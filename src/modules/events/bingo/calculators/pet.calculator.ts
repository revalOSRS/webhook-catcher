/**
 * Pet Progress Calculator
 */

import type { UnifiedGameEvent } from '../types/unified-event.types.js'
import type { PetRequirement } from '../../../../types/bingo-requirements.js'
import type { ProgressUpdate, ExistingProgress } from './progress-calculator.types.js'

export function calculatePetProgress(
  event: UnifiedGameEvent,
  requirement: PetRequirement,
  existing: ExistingProgress | null
): ProgressUpdate {
  const currentProgress = existing?.progressValue || 0
  const newProgress = currentProgress + 1 // Each pet event = +1
  const isCompleted = newProgress >= requirement.amount

  return {
    progressValue: newProgress,
    metadata: {
      ...existing?.metadata,
      count: newProgress,
      current_value: newProgress,
      target_value: requirement.amount,
      last_update_at: event.timestamp.toISOString(),
      last_pet: (event.data as any).petName
    },
    isCompleted
  }
}


/**
 * BA Gambles Progress Calculator
 */

import type { UnifiedGameEvent } from '../types/unified-event.types.js'
import type { BaGamblesRequirement } from '../../../../types/bingo-requirements.js'
import type { ProgressUpdate, ExistingProgress } from './progress-calculator.types.js'

export function calculateBaGamblesProgress(
  event: UnifiedGameEvent,
  requirement: BaGamblesRequirement,
  existing: ExistingProgress | null
): ProgressUpdate {
  const baData = event.data as any
  const gambleCount = baData.gambleCount || 1
  
  const currentProgress = existing?.progressValue || 0
  const newProgress = currentProgress + gambleCount
  const isCompleted = newProgress >= requirement.amount

  return {
    progressValue: newProgress,
    metadata: {
      ...existing?.metadata,
      count: newProgress,
      current_value: newProgress,
      target_value: requirement.amount,
      last_update_at: event.timestamp.toISOString(),
      last_gamble_count: gambleCount
    },
    isCompleted
  }
}


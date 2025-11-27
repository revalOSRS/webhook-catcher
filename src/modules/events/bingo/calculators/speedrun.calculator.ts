/**
 * Speedrun Progress Calculator
 * For speedruns, lower time is better - we track the best (lowest) time
 */

import type { UnifiedGameEvent } from '../types/unified-event.types.js'
import type { SpeedrunRequirement, TieredRequirement } from '../../../../types/bingo-requirements.js'
import type { ProgressUpdate, ExistingProgress } from './progress-calculator.types.js'

export function calculateSpeedrunProgress(
  event: UnifiedGameEvent,
  requirement: SpeedrunRequirement | TieredRequirement,
  existing: ExistingProgress | null
): ProgressUpdate {
  const speedrunData = event.data as any
  const currentTime = speedrunData.timeSeconds
  
  // For tiered requirements, check which tier this time qualifies for
  if ('tier' in requirement && 'points' in requirement) {
    return calculateTieredSpeedrunProgress(event, requirement as TieredRequirement, existing)
  }
  
  // Single requirement - check if time meets goal
  const req = requirement as SpeedrunRequirement
  const bestTime = existing?.progressValue ? Math.min(existing.progressValue, currentTime) : currentTime
  const isCompleted = bestTime <= req.goal_seconds

  return {
    progressValue: bestTime,
    metadata: {
      ...existing?.metadata,
      current_value: bestTime,
      target_value: req.goal_seconds,
      last_update_at: event.timestamp.toISOString(),
      last_time: currentTime,
      is_personal_best: speedrunData.isPersonalBest
    },
    isCompleted
  }
}

function calculateTieredSpeedrunProgress(
  event: UnifiedGameEvent,
  tieredReq: TieredRequirement,
  existing: ExistingProgress | null
): ProgressUpdate {
  const speedrunData = event.data as any
  const currentTime = speedrunData.timeSeconds
  const requirement = tieredReq.requirement as SpeedrunRequirement
  
  const bestTime = existing?.progressValue ? Math.min(existing.progressValue, currentTime) : currentTime
  const completedTiers = existing?.metadata?.completed_tiers || []
  const isTierCompleted = bestTime <= requirement.goal_seconds && !completedTiers.includes(tieredReq.tier)
  
  // Mark this tier as completed if time qualifies
  if (isTierCompleted) {
    completedTiers.push(tieredReq.tier)
  }
  
  // Tile is complete if any tier is completed
  const isCompleted = completedTiers.length > 0

  return {
    progressValue: bestTime,
    metadata: {
      ...existing?.metadata,
      current_value: bestTime,
      target_value: requirement.goal_seconds,
      completed_tiers: completedTiers.sort((a, b) => a - b),
      current_tier: completedTiers.length > 0 ? Math.max(...completedTiers) : undefined,
      last_update_at: event.timestamp.toISOString(),
      last_time: currentTime,
      is_personal_best: speedrunData.isPersonalBest
    },
    isCompleted,
    completedTier: isTierCompleted ? tieredReq.tier : undefined
  }
}


/**
 * Experience Progress Calculator
 * Fetches XP from WiseOldMan API and calculates progress since event start
 */

import type { UnifiedGameEvent } from '../types/unified-event.types.js'
import type { ExperienceRequirement } from '../../../../types/bingo-requirements.js'
import type { ProgressUpdate, ExistingProgress } from './progress-calculator.types.js'
import { WiseOldManService } from '../../../wiseoldman/index.js'

/**
 * Calculate experience progress
 * Requires fetching XP from WiseOldMan API
 */
export async function calculateExperienceProgress(
  event: UnifiedGameEvent,
  requirement: ExperienceRequirement,
  existing: ExistingProgress | null,
  eventStartDate: Date
): Promise<ProgressUpdate> {
  // Get current XP from WiseOldMan API
  const currentXp = await fetchXpFromWiseOldMan(event.playerName, requirement.skill)
  if (currentXp === null) {
    // If we can't fetch XP, return existing progress unchanged
    return {
      progressValue: existing?.progressValue || 0,
      metadata: existing?.metadata || {},
      isCompleted: false
    }
  }

  // Get baseline XP (XP at event start)
  const baselineXp = existing?.metadata?.baseline_xp
  if (!baselineXp) {
    // First time tracking - fetch historical XP from WiseOldMan
    const historicalXp = await fetchHistoricalXpFromWiseOldMan(event.playerName, requirement.skill, eventStartDate)
    const baseline = historicalXp || currentXp
    
    const gainedXp = currentXp - baseline
    const isCompleted = gainedXp >= requirement.experience

    return {
      progressValue: gainedXp,
      metadata: {
        baseline_xp: baseline,
        current_xp: currentXp,
        gained_xp: gainedXp,
        target_xp: requirement.experience,
        last_update_at: event.timestamp.toISOString()
      },
      isCompleted
    }
  }

  // Calculate gained XP since baseline
  const gainedXp = currentXp - baselineXp
  const isCompleted = gainedXp >= requirement.experience

  return {
    progressValue: gainedXp,
    metadata: {
      ...existing?.metadata,
      baseline_xp: baselineXp,
      current_xp: currentXp,
      gained_xp: gainedXp,
      target_xp: requirement.experience,
      last_update_at: event.timestamp.toISOString()
    },
    isCompleted
  }
}

/**
 * Fetch current XP from WiseOldMan API
 */
async function fetchXpFromWiseOldMan(playerName: string, skill: string): Promise<number | null> {
  try {
    const player = await WiseOldManService.searchPlayer(playerName)
    if (!player || !player.latestSnapshot) {
      return null
    }

    // Map skill name to WOM skill key (case-insensitive)
    const skillKey = mapSkillNameToWOMKey(skill)
    if (!skillKey) {
      console.warn(`[ExperienceCalculator] Unknown skill name: ${skill}`)
      return null
    }

    const skills = player.latestSnapshot.data?.skills || {}
    const skillData = skills[skillKey]
    
    if (!skillData || skillData.experience === undefined) {
      return null
    }

    return skillData.experience
  } catch (error) {
    console.error(`Error fetching XP from WiseOldMan for ${playerName} - ${skill}:`, error)
    return null
  }
}

/**
 * Fetch historical XP from WiseOldMan API at a specific date
 * Uses snapshots to find XP at a specific point in time
 */
async function fetchHistoricalXpFromWiseOldMan(
  playerName: string, 
  skill: string, 
  date: Date
): Promise<number | null> {
  try {
    // Get player snapshots around the event start date
    const snapshots = await WiseOldManService.getPlayerSnapshots(playerName, 100)
    if (!snapshots || snapshots.length === 0) {
      return null
    }

    // Find the snapshot closest to (but before or at) the event start date
    const skillKey = mapSkillNameToWOMKey(skill)
    if (!skillKey) {
      return null
    }

    // Sort snapshots by date (newest first) and find the one closest to event start
    const sortedSnapshots = snapshots
      .filter(s => s.createdAt && new Date(s.createdAt) <= date)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA // Newest first
      })

    if (sortedSnapshots.length === 0) {
      // No snapshot before event start, use oldest available
      const oldest = snapshots[snapshots.length - 1]
      const skills = oldest.data?.skills || {}
      const skillData = skills[skillKey]
      return skillData?.experience || null
    }

    // Use the snapshot closest to event start
    const closestSnapshot = sortedSnapshots[0]
    const skills = closestSnapshot.data?.skills || {}
    const skillData = skills[skillKey]
    
    return skillData?.experience || null
  } catch (error) {
    console.error(`Error fetching historical XP from WiseOldMan for ${playerName} - ${skill}:`, error)
    return null
  }
}

/**
 * Map skill name to WiseOldMan skill key
 */
function mapSkillNameToWOMKey(skillName: string): string | null {
  const skillMap: Record<string, string> = {
    'attack': 'attack',
    'strength': 'strength',
    'defence': 'defence',
    'ranged': 'ranged',
    'prayer': 'prayer',
    'magic': 'magic',
    'runecraft': 'runecraft',
    'construction': 'construction',
    'hitpoints': 'hitpoints',
    'agility': 'agility',
    'herblore': 'herblore',
    'thieving': 'thieving',
    'crafting': 'crafting',
    'fletching': 'fletching',
    'slayer': 'slayer',
    'hunter': 'hunter',
    'mining': 'mining',
    'smithing': 'smithing',
    'fishing': 'fishing',
    'cooking': 'cooking',
    'firemaking': 'firemaking',
    'woodcutting': 'woodcutting',
    'farming': 'farming',
    'overall': 'overall'
  }

  return skillMap[skillName.toLowerCase()] || null
}


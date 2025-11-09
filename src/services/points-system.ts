  /**
 * Points System
 * 
 * Defines all rules for awarding points to players based on achievements
 */

import type { 
  SyncEventPayload, 
  CombatAchievementTier,
  DiaryProgress 
} from '../runelite/types/sync-event.type.js'

// ===== Point Values =====

export const POINTS_CONFIG = {
  // Quest Points: 1 point per quest point
  questPoints: {
    perPoint: 1
  },
  
  // Achievement Diaries: Points per tier completion
  achievementDiaries: {
    easy: 5,
    medium: 10,
    hard: 20,
    elite: 50
  },
  
  // Combat Achievements: Points match in-game points
  combatAchievements: {
    // Points are already in the task data from game
    useGamePoints: true
  },
  
  // Collection Log: Points for unique items
  collectionLog: {
    perUniqueItem: 2,
    // Bonus for completion milestones
    milestones: {
      100: 50,
      250: 100,
      500: 250,
      1000: 500,
      1500: 1000
    }
  },
  
  // Boss Kill Counts: Points per milestone
  killCounts: {
    milestones: [50, 100, 250, 500, 1000, 2500, 5000],
    pointsPerMilestone: 10
  }
} as const

// ===== Point Categories =====

export enum PointCategory {
  QUESTS = 'quests',
  ACHIEVEMENT_DIARIES = 'achievement_diaries',
  COMBAT_ACHIEVEMENTS = 'combat_achievements',
  COLLECTION_LOG = 'collection_log',
  BOSS_KILLS = 'boss_kills',
  SKILLS = 'skills'
}

// ===== Points Breakdown Interface =====

export interface PointsBreakdown {
  total: number
  byCategory: {
    [PointCategory.QUESTS]: number
    [PointCategory.ACHIEVEMENT_DIARIES]: number
    [PointCategory.COMBAT_ACHIEVEMENTS]: number
    [PointCategory.COLLECTION_LOG]: number
    [PointCategory.BOSS_KILLS]: number
    [PointCategory.SKILLS]: number
  }
}

// ===== Calculate Points from SYNC Event =====

export function calculatePointsFromSync(payload: SyncEventPayload): PointsBreakdown {
  const breakdown: PointsBreakdown = {
    total: 0,
    byCategory: {
      [PointCategory.QUESTS]: 0,
      [PointCategory.ACHIEVEMENT_DIARIES]: 0,
      [PointCategory.COMBAT_ACHIEVEMENTS]: 0,
      [PointCategory.COLLECTION_LOG]: 0,
      [PointCategory.BOSS_KILLS]: 0,
      [PointCategory.SKILLS]: 0
    }
  }

  // Calculate Quest Points
  breakdown.byCategory[PointCategory.QUESTS] = calculateQuestPoints(payload.quests.questPoints)

  // Calculate Achievement Diary Points
  breakdown.byCategory[PointCategory.ACHIEVEMENT_DIARIES] = calculateDiaryPoints(payload.achievementDiaries.progress)

  // Calculate Combat Achievement Points
  breakdown.byCategory[PointCategory.COMBAT_ACHIEVEMENTS] = payload.combatAchievements.totalPoints

  // Calculate Collection Log Points
  breakdown.byCategory[PointCategory.COLLECTION_LOG] = calculateCollectionLogPoints(payload.collectionLog.obtainedItems)

  // Calculate Boss KC Points (from collection log KC data)
  breakdown.byCategory[PointCategory.BOSS_KILLS] = calculateBossKillPoints(payload.collectionLog)

  // Calculate total
  breakdown.total = Object.values(breakdown.byCategory).reduce((sum, points) => sum + points, 0)

  return breakdown
}

// ===== Individual Point Calculators =====

function calculateQuestPoints(questPoints: number): number {
  return questPoints * POINTS_CONFIG.questPoints.perPoint
}

function calculateDiaryPoints(diaryProgress: Record<string, DiaryProgress>): number {
  let totalPoints = 0
  
  for (const progress of Object.values(diaryProgress)) {
    if (progress.easy) totalPoints += POINTS_CONFIG.achievementDiaries.easy
    if (progress.medium) totalPoints += POINTS_CONFIG.achievementDiaries.medium
    if (progress.hard) totalPoints += POINTS_CONFIG.achievementDiaries.hard
    if (progress.elite) totalPoints += POINTS_CONFIG.achievementDiaries.elite
  }
  
  return totalPoints
}

function calculateCollectionLogPoints(obtainedItems: number): number {
  let totalPoints = obtainedItems * POINTS_CONFIG.collectionLog.perUniqueItem
  
  // Add milestone bonuses
  for (const [milestone, bonus] of Object.entries(POINTS_CONFIG.collectionLog.milestones)) {
    if (obtainedItems >= parseInt(milestone)) {
      totalPoints += bonus
    }
  }
  
  return totalPoints
}

/**
 * Calculate Boss Kill Points
 * 
 * Awards points for reaching KC milestones on bosses.
 * Milestones: 50, 100, 250, 500, 1000, 2500, 5000
 * 
 * @param collectionLog Collection log data containing boss KC
 * @returns Total points from boss KC milestones
 */
function calculateBossKillPoints(collectionLog: any): number {
  let totalPoints = 0
  
  // Iterate through all categories and entries to get KC
  for (const category of Object.values(collectionLog.categories)) {
    for (const entry of Object.values(category as any)) {
      // Type-safe extraction of KC
      const kc = (entry as any).kc
      const killCount = typeof kc === 'number' ? kc : 0
      
      // Award points for each milestone reached
      for (const milestone of POINTS_CONFIG.killCounts.milestones) {
        if (killCount >= milestone) {
          totalPoints += POINTS_CONFIG.killCounts.pointsPerMilestone
        }
      }
    }
  }
  
  return totalPoints
}

// ===== Helper Functions =====

/**
 * Calculate points difference between two states
 * Used for incremental point awards after first sync
 */
export function calculatePointsDifference(
  newBreakdown: PointsBreakdown, 
  oldBreakdown: PointsBreakdown
): PointsBreakdown {
  return {
    total: newBreakdown.total - oldBreakdown.total,
    byCategory: {
      [PointCategory.QUESTS]: 
        newBreakdown.byCategory[PointCategory.QUESTS] - oldBreakdown.byCategory[PointCategory.QUESTS],
      [PointCategory.ACHIEVEMENT_DIARIES]: 
        newBreakdown.byCategory[PointCategory.ACHIEVEMENT_DIARIES] - oldBreakdown.byCategory[PointCategory.ACHIEVEMENT_DIARIES],
      [PointCategory.COMBAT_ACHIEVEMENTS]: 
        newBreakdown.byCategory[PointCategory.COMBAT_ACHIEVEMENTS] - oldBreakdown.byCategory[PointCategory.COMBAT_ACHIEVEMENTS],
      [PointCategory.COLLECTION_LOG]: 
        newBreakdown.byCategory[PointCategory.COLLECTION_LOG] - oldBreakdown.byCategory[PointCategory.COLLECTION_LOG],
      [PointCategory.BOSS_KILLS]: 
        newBreakdown.byCategory[PointCategory.BOSS_KILLS] - oldBreakdown.byCategory[PointCategory.BOSS_KILLS],
      [PointCategory.SKILLS]: 
        newBreakdown.byCategory[PointCategory.SKILLS] - oldBreakdown.byCategory[PointCategory.SKILLS]
    }
  }
}

/**
 * Format points for display
 */
export function formatPoints(points: number): string {
  return points.toLocaleString()
}

/**
 * Get points leaderboard category name
 */
export function getCategoryDisplayName(category: PointCategory): string {
  const names = {
    [PointCategory.QUESTS]: 'Quests',
    [PointCategory.ACHIEVEMENT_DIARIES]: 'Achievement Diaries',
    [PointCategory.COMBAT_ACHIEVEMENTS]: 'Combat Achievements',
    [PointCategory.COLLECTION_LOG]: 'Collection Log',
    [PointCategory.BOSS_KILLS]: 'Boss Kills',
    [PointCategory.SKILLS]: 'Skills'
  }
  return names[category]
}


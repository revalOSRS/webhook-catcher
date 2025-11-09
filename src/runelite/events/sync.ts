/**
 * RuneLite Plugin - SYNC Event Handler
 * 
 * Processes comprehensive player data synchronization from RuneLite plugin
 */

import { SyncEventPayload } from '../types/sync-event.type.js'
import { storeSyncData } from '../../db/services/sync.service.js'
import { formatPoints } from '../../services/points-system.js'

/**
 * Process SYNC event from RuneLite plugin
 */
export async function handleSyncEvent(payload: SyncEventPayload): Promise<{
  player: string
  accountHash?: string
  questPoints: number
  diariesCompleted: number
  combatAchievementsCompleted: number
  collectionLogItems: number
  syncedAt: Date
}> {
  const { player, quests, achievementDiaries, combatAchievements, collectionLog, eventTimestamp } = payload

  console.log('========================================')
  console.log('Processing SYNC event')
  console.log('========================================')
  console.log(`Player: ${player.username}`)
  console.log(`Account Type: ${player.accountType}`)
  console.log(`World: ${player.world || 'Unknown'}`)
  console.log(`Combat Level: ${player.combatLevel || 'Unknown'}`)
  console.log(`Total Level: ${player.totalLevel || 'Unknown'}`)
  console.log('----------------------------------------')
  console.log(`Quest Points: ${quests.questPoints}/${quests.totalQuests * 2}`)
  console.log(`Quests Completed: ${quests.completedQuests}/${quests.totalQuests}`)
  console.log('----------------------------------------')
  console.log('Achievement Diaries:')
  
  // Calculate tier completion counts
  const diaryAreas = Object.values(achievementDiaries.progress)
  const tierCounts = {
    easy: diaryAreas.filter(d => d.easy).length,
    medium: diaryAreas.filter(d => d.medium).length,
    hard: diaryAreas.filter(d => d.hard).length,
    elite: diaryAreas.filter(d => d.elite).length
  }
  const totalAreas = diaryAreas.length
  
  console.log(`  Easy: ${tierCounts.easy}/${totalAreas}`)
  console.log(`  Medium: ${tierCounts.medium}/${totalAreas}`)
  console.log(`  Hard: ${tierCounts.hard}/${totalAreas}`)
  console.log(`  Elite: ${tierCounts.elite}/${totalAreas}`)
  console.log(`  Total: ${achievementDiaries.totalCompleted}/${achievementDiaries.totalDiaries}`)
  console.log('----------------------------------------')
  console.log('Combat Achievements:')
  console.log(`  Current Tier: ${combatAchievements.currentTier}`)
  console.log(`  Easy: ${combatAchievements.tierProgress.easy.completed}/${combatAchievements.tierProgress.easy.total}`)
  console.log(`  Medium: ${combatAchievements.tierProgress.medium.completed}/${combatAchievements.tierProgress.medium.total}`)
  console.log(`  Hard: ${combatAchievements.tierProgress.hard.completed}/${combatAchievements.tierProgress.hard.total}`)
  console.log(`  Elite: ${combatAchievements.tierProgress.elite.completed}/${combatAchievements.tierProgress.elite.total}`)
  console.log(`  Master: ${combatAchievements.tierProgress.master.completed}/${combatAchievements.tierProgress.master.total}`)
  console.log(`  Grandmaster: ${combatAchievements.tierProgress.grandmaster.completed}/${combatAchievements.tierProgress.grandmaster.total}`)
  
  // Calculate total completed and total tasks
  const totalCompleted = Object.values(combatAchievements.tierProgress).reduce((sum, tier) => sum + tier.completed, 0)
  const totalTasks = Object.values(combatAchievements.tierProgress).reduce((sum, tier) => sum + tier.total, 0)
  
  console.log(`  Total: ${totalCompleted}/${totalTasks}`)
  console.log(`  Points: ${combatAchievements.totalPoints}`)
  console.log(`  Tasks Loaded: ${combatAchievements.totalTasksLoaded}`)
  console.log('----------------------------------------')
  console.log('Collection Log:')
  console.log(`  Items: ${collectionLog.obtainedItems}/${collectionLog.totalItems}`)
  
  // Calculate completion percentage
  const completionPercentage = collectionLog.totalItems > 0 
    ? (collectionLog.obtainedItems / collectionLog.totalItems) * 100 
    : 0
  
  console.log(`  Completion: ${completionPercentage.toFixed(2)}%`)
  console.log(`  Categories: ${Object.keys(collectionLog.categories).length}`)
  console.log(`  Note: ${collectionLog.note}`)
  console.log('========================================')
  console.log('Storing data in database...')
  
  // Store all data in database
  const dbResult = await storeSyncData(payload)
  
  console.log('========================================')
  console.log('Database storage complete!')
  console.log(`Account ID: ${dbResult.accountId}`)
  console.log(`Overall First Sync: ${dbResult.isFirstSync ? 'Yes' : 'No'}`)
  console.log('')
  console.log('Sync Status (Per Category):')
  console.log(`  ✅ Quests: ${dbResult.syncStatus.isFirstQuestSync ? 'FIRST SYNC (retroactive points)' : 'Delta sync'}`)
  console.log(`  ✅ Diaries: ${dbResult.syncStatus.isFirstDiarySync ? 'FIRST SYNC (retroactive points)' : 'Delta sync'}`)
  console.log(`  ✅ Combat Achievements: ${dbResult.syncStatus.isFirstCombatAchievementSync ? 'FIRST SYNC (retroactive points)' : 'Delta sync'}`)
  console.log(`  ✅ Collection Log: ${dbResult.syncStatus.isFirstCollectionLogSync ? 'FIRST SYNC (retroactive points)' : 'Delta sync'}`)
  console.log('')
  console.log('Points Awarded:')
  console.log(`  Total: ${formatPoints(dbResult.pointsAwarded.total)}`)
  console.log(`  Quests: ${formatPoints(dbResult.pointsAwarded.byCategory.quests)}`)
  console.log(`  Diaries: ${formatPoints(dbResult.pointsAwarded.byCategory.achievement_diaries)}`)
  console.log(`  Combat Achievements: ${formatPoints(dbResult.pointsAwarded.byCategory.combat_achievements)}`)
  console.log(`  Collection Log: ${formatPoints(dbResult.pointsAwarded.byCategory.collection_log)}`)
  console.log(`  Boss Kills: ${formatPoints(dbResult.pointsAwarded.byCategory.boss_kills)}`)
  console.log('========================================\n')

  // Calculate total CA completed
  const caCompleted = Object.values(combatAchievements.tierProgress).reduce((sum, tier) => sum + tier.completed, 0)
  
  return {
    player: player.username,
    accountHash: player.accountHash,
    questPoints: quests.questPoints,
    diariesCompleted: achievementDiaries.totalCompleted,
    combatAchievementsCompleted: caCompleted,
    collectionLogItems: collectionLog.obtainedItems,
    syncedAt: new Date(eventTimestamp)
  }
}



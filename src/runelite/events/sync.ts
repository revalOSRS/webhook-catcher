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

  const dbResult = await storeSyncData(payload)

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



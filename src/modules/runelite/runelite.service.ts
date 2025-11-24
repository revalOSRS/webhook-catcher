/**
 * RuneLite Service
 * RuneLite plugin webhook event processing and integration
 */

import type { RuneLiteEvent, SyncEventPayload } from './types/index.js'
import { storeSyncData } from '../../db/services/sync.service.js'

/**
 * RuneLite Service Class
 * Handles RuneLite plugin webhook events and data processing
 */
export class RuneLiteService {
  /**
   * Main handler for RuneLite plugin webhooks
   */
  static async handleRuneLiteEvent(event: RuneLiteEvent): Promise<any> {
    const { eventType } = event

    console.log(`[RuneLite Handler] Received ${eventType} event`)

    switch (eventType) {
      case 'SYNC':
        return await this.handleSyncEvent(event as SyncEventPayload)

      // Add more event types here as needed
      // case 'ACHIEVEMENT':
      //   return await this.handleAchievementEvent(event as AchievementEventPayload)
      // case 'LOOT':
      //   return await this.handleLootEvent(event as LootEventPayload)

      default:
        console.warn(`[RuneLite Handler] Unknown event type: ${eventType}`)
        return {
          status: 'warning',
          message: `Unknown event type: ${eventType}`,
          eventType
        }
    }
  }

  /**
   * Process SYNC event from RuneLite plugin
   */
  static async handleSyncEvent(payload: SyncEventPayload): Promise<{
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

  /**
   * Validate RuneLite event structure
   */
  static validateRuneLiteEvent(body: any): { valid: boolean; error?: string } {
    if (!body) {
      return { valid: false, error: 'Empty request body' }
    }

    if (!body.eventType) {
      return { valid: false, error: 'Missing eventType field' }
    }

    if (typeof body.eventTimestamp !== 'number') {
      return { valid: false, error: 'Missing or invalid eventTimestamp field' }
    }

    // Event-specific validation
    switch (body.eventType) {
      case 'SYNC':
        return this.validateSyncEvent(body)
      default:
        // Unknown event types are valid but will be handled as warnings
        return { valid: true }
    }
  }

  /**
   * Validate SYNC event structure
   */
  private static validateSyncEvent(body: any): { valid: boolean; error?: string } {
    const requiredFields = ['player', 'quests', 'achievementDiaries', 'combatAchievements', 'collectionLog']

    for (const field of requiredFields) {
      if (!body[field]) {
        return { valid: false, error: `Missing required field: ${field}` }
      }
    }

    // Validate player field
    if (!body.player.username) {
      return { valid: false, error: 'Missing player.username' }
    }

    return { valid: true }
  }

  /**
   * Get supported event types
   */
  static getSupportedEventTypes(): string[] {
    return ['SYNC'] // Add more as they are implemented
  }

  /**
   * Check if event type is supported
   */
  static isEventTypeSupported(eventType: string): boolean {
    return this.getSupportedEventTypes().includes(eventType)
  }
}


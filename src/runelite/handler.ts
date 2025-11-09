/**
 * RuneLite Plugin Event Handler
 * 
 * Central router for all RuneLite plugin webhook events
 */

import { RuneLiteEvent } from './types/index.js'
import { SyncEventPayload } from './types/sync-event.type.js'
import { handleSyncEvent } from './events/sync.js'

/**
 * Main handler for RuneLite plugin webhooks
 */
export async function handleRuneLiteEvent(event: RuneLiteEvent): Promise<any> {
  const { eventType } = event

  console.log(`[RuneLite Handler] Received ${eventType} event`)

  switch (eventType) {
    case 'SYNC':
      return await handleSyncEvent(event as SyncEventPayload)
    
    // Add more event types here as needed
    // case 'ACHIEVEMENT':
    //   return await handleAchievementEvent(event as AchievementEventPayload)
    // case 'LOOT':
    //   return await handleLootEvent(event as LootEventPayload)
    
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
 * Validate RuneLite event structure
 */
export function validateRuneLiteEvent(body: any): { valid: boolean; error?: string } {
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
      return validateSyncEvent(body)
    default:
      // Unknown event types are valid but will be handled as warnings
      return { valid: true }
  }
}

/**
 * Validate SYNC event structure
 */
function validateSyncEvent(body: any): { valid: boolean; error?: string } {
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


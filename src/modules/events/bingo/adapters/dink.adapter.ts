/**
 * Dink Event Adapter
 * Converts Dink events to UnifiedGameEvent format
 */

import type { 
  DinkEvent, 
  DinkLootEvent, 
  DinkPetEvent, 
  DinkSpeedrunEvent, 
  DinkBarbarianAssaultGambleEvent,
  DinkLogoutEvent,
  DinkKillCountEvent
} from '../../../dink/events/event.js'
import { DinkEventType } from '../../../dink/events/event.js'
import type { UnifiedGameEvent, LootEventData, PetEventData, SpeedrunEventData, BaGambleEventData, LogoutEventData } from '../types/unified-event.types.js'
import { query } from '../../../../db/connection.js'

/**
 * Convert Dink event to UnifiedGameEvent
 * Handles both typed DinkEvent objects and raw payload objects
 */
export async function adaptDinkEvent(dinkEvent: DinkEvent | any): Promise<UnifiedGameEvent | null> {
  const eventType = dinkEvent.type
  
  // Get OSRS account ID from player name
  const osrsAccountId = await getOsrsAccountIdFromPlayerName(dinkEvent.playerName)
  
  const timestamp = new Date() // Dink events don't have explicit timestamp, use current time

  // Check event type (handle both string and enum)
  if (eventType === 'LOOT' || eventType === DinkEventType.LOOT) {
    return adaptLootEvent(dinkEvent as DinkLootEvent, osrsAccountId, timestamp)
  }
  
  if (eventType === 'PET' || eventType === DinkEventType.PET) {
    return adaptPetEvent(dinkEvent as DinkPetEvent, osrsAccountId, timestamp)
  }
  
  if (eventType === 'SPEEDRUN' || eventType === DinkEventType.SPEEDRUN) {
    return adaptSpeedrunEvent(dinkEvent as DinkSpeedrunEvent, osrsAccountId, timestamp)
  }
  
  if (eventType === 'BARBARIAN_ASSAULT_GAMBLE' || eventType === DinkEventType.BARBARIAN_ASSAULT_GAMBLE) {
    return adaptBaGambleEvent(dinkEvent as DinkBarbarianAssaultGambleEvent, osrsAccountId, timestamp)
  }
  
  if (eventType === 'LOGOUT' || eventType === DinkEventType.LOGOUT) {
    return adaptLogoutEvent(dinkEvent as DinkLogoutEvent, osrsAccountId, timestamp)
  }
  
  // Handle KILL_COUNT events that have a time field (speedrun times)
  if (eventType === 'KILL_COUNT' || eventType === DinkEventType.KILL_COUNT) {
    const killCountEvent = dinkEvent as DinkKillCountEvent | any
    const extra = killCountEvent.extra || {}
    // If the kill count event has a time field, treat it as a speedrun
    if (extra.time) {
      return adaptKillCountAsSpeedrun(killCountEvent, osrsAccountId, timestamp)
    }
    // Otherwise, KILL_COUNT events without time are not relevant for bingo tracking
    return null
  }

  // Event type not supported for bingo tracking
  return null
}

function adaptLootEvent(event: DinkLootEvent | any, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent {
  // Handle both typed events and raw payloads
  const extra = event.extra || {}
  const items = extra.items || []
  const totalValue = items.reduce((sum: number, item: any) => sum + ((item.priceEach || 0) * (item.quantity || 0)), 0)
  
  return {
    eventType: 'LOOT',
    playerName: event.playerName,
    osrsAccountId,
    timestamp,
    source: 'dink',
    data: {
      items: items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        name: item.name,
        priceEach: item.priceEach || 0
      })),
      source: extra.source,
      totalValue
    }
  }
}

function adaptPetEvent(event: DinkPetEvent | any, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent {
  const extra = event.extra || {}
  return {
    eventType: 'PET',
    playerName: event.playerName,
    osrsAccountId,
    timestamp,
    source: 'dink',
    data: {
      petName: extra.petName,
      milestone: extra.milestone
    }
  }
}

function adaptSpeedrunEvent(event: DinkSpeedrunEvent | any, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent {
  const extra = event.extra || {}
  // Parse time string (e.g., "1:23:45" or "23:45") to seconds
  const timeSeconds = parseTimeStringToSeconds(extra.currentTime || extra.personalBest || '0')
  
  return {
    eventType: 'SPEEDRUN',
    playerName: event.playerName,
    osrsAccountId,
    timestamp,
    source: 'dink',
    data: {
      location: extra.questName, // Dink uses questName for speedruns
      timeSeconds,
      isPersonalBest: extra.isPersonalBest || false
    }
  }
}

function adaptBaGambleEvent(event: DinkBarbarianAssaultGambleEvent | any, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent {
  const extra = event.extra || {}
  return {
    eventType: 'BA_GAMBLE',
    playerName: event.playerName,
    osrsAccountId,
    timestamp,
    source: 'dink',
    data: {
      gambleCount: extra.gambleCount || 1
    }
  }
}

function adaptLogoutEvent(event: DinkLogoutEvent, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent {
  return {
    eventType: 'LOGOUT',
    playerName: event.playerName,
    osrsAccountId,
    timestamp,
    source: 'dink',
    data: {} // XP data will be fetched from WiseOldMan API
  }
}

/**
 * Convert KILL_COUNT event with time to SPEEDRUN event
 * Some NPC speedrun times come through as KILL_COUNT events with a time field
 */
function adaptKillCountAsSpeedrun(event: DinkKillCountEvent | any, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent {
  const extra = event.extra || {}
  // Parse ISO 8601 duration format (e.g., "PT1M25S" = 1 minute 25 seconds)
  const timeSeconds = parseIso8601DurationToSeconds(extra.time || '0')
  
  return {
    eventType: 'SPEEDRUN',
    playerName: event.playerName,
    osrsAccountId,
    timestamp,
    source: 'dink',
    data: {
      location: extra.boss || 'Unknown', // Use boss name as location
      timeSeconds,
      isPersonalBest: extra.isPersonalBest || false
    }
  }
}

/**
 * Parse time string to seconds
 * Supports formats: "1:23:45" (hours:minutes:seconds), "23:45" (minutes:seconds), "45" (seconds)
 */
function parseTimeStringToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  
  if (parts.length === 3) {
    // hours:minutes:seconds
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    // minutes:seconds
    return parts[0] * 60 + parts[1]
  } else {
    // seconds only
    return parts[0]
  }
}

/**
 * Parse ISO 8601 duration format to seconds
 * Supports formats: "PT1M25S" (1 minute 25 seconds), "PT45S" (45 seconds), "PT1H2M3S" (1 hour 2 minutes 3 seconds)
 * Format: PT[hours]H[minutes]M[seconds]S
 */
function parseIso8601DurationToSeconds(duration: string): number {
  // Remove PT prefix
  const timeStr = duration.replace(/^PT/i, '')
  
  let totalSeconds = 0
  
  // Match hours: H followed by digits
  const hoursMatch = timeStr.match(/(\d+)H/i)
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600
  }
  
  // Match minutes: M followed by digits
  const minutesMatch = timeStr.match(/(\d+)M/i)
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60
  }
  
  // Match seconds: S followed by digits
  const secondsMatch = timeStr.match(/(\d+)S/i)
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1], 10)
  }
  
  return totalSeconds
}

/**
 * Get OSRS account ID from player name
 */
async function getOsrsAccountIdFromPlayerName(playerName: string): Promise<number | undefined> {
  try {
    const result = await query(
      'SELECT id FROM osrs_accounts WHERE osrs_nickname = $1 LIMIT 1',
      [playerName]
    )
    return result.length > 0 ? result[0].id : undefined
  } catch (error) {
    console.error(`Error looking up OSRS account for player ${playerName}:`, error)
    return undefined
  }
}


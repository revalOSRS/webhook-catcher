/**
 * Dink Event Adapter
 * Converts Dink events to UnifiedGameEvent format for bingo tile processing
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
import type { UnifiedGameEvent } from '../types/unified-event.type.js'
import { UnifiedEventType, UnifiedEventSource } from '../types/unified-event.type.js'
import { OsrsAccountsService } from '../../../osrs-accounts/osrs-accounts.service.js'

type SupportedDinkEvent = 
  | DinkLootEvent 
  | DinkPetEvent 
  | DinkSpeedrunEvent 
  | DinkBarbarianAssaultGambleEvent 
  | DinkLogoutEvent 
  | DinkKillCountEvent

/**
 * Adapter map for converting Dink events to UnifiedGameEvent
 * Maps event types to their respective adapter functions
 */
const eventAdapters: Partial<Record<DinkEventType, (event: SupportedDinkEvent, osrsAccountId: number | undefined, timestamp: Date) => UnifiedGameEvent | null>> = {
  [DinkEventType.LOOT]: (event, osrsAccountId, timestamp) => 
    adaptLootEvent(event as DinkLootEvent, osrsAccountId, timestamp),
  
  [DinkEventType.PET]: (event, osrsAccountId, timestamp) => 
    adaptPetEvent(event as DinkPetEvent, osrsAccountId, timestamp),
  
  [DinkEventType.SPEEDRUN]: (event, osrsAccountId, timestamp) => 
    adaptSpeedrunEvent(event as DinkSpeedrunEvent, osrsAccountId, timestamp),
  
  [DinkEventType.BARBARIAN_ASSAULT_GAMBLE]: (event, osrsAccountId, timestamp) => 
    adaptBaGambleEvent(event as DinkBarbarianAssaultGambleEvent, osrsAccountId, timestamp),
  
  [DinkEventType.LOGOUT]: (event, osrsAccountId, timestamp) => 
    adaptLogoutEvent(event as DinkLogoutEvent, osrsAccountId, timestamp),
  
  [DinkEventType.KILL_COUNT]: (event, osrsAccountId, timestamp) => 
    adaptKillCountAsSpeedrun(event as DinkKillCountEvent, osrsAccountId, timestamp),
}

/**
 * Converts a Dink event to a UnifiedGameEvent.
 * 
 * Looks up the OSRS account ID from the player name and routes the event
 * to the appropriate type-specific adapter. Returns null for unsupported
 * event types or events that don't qualify for bingo tracking.
 */
export const adaptDinkEvent = async (dinkEvent: DinkEvent): Promise<UnifiedGameEvent | null> => {
  const account = await OsrsAccountsService.getAccountByNickname(dinkEvent.playerName)
  const timestamp = new Date()
  
  const adapter = eventAdapters[dinkEvent.type]
  if (adapter) {
    return adapter(dinkEvent as SupportedDinkEvent, account?.id, timestamp)
  }
  
  return null
}

/**
 * Converts a loot event to unified format.
 * 
 * Extracts items from the event, calculates total value, and maps each item
 * to the unified item structure with id, quantity, name, and priceEach.
 */
const adaptLootEvent = (event: DinkLootEvent, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent => {
  const { items, source } = event.extra
  
  const unifiedItems = items.map(item => ({
    id: item.id,
    quantity: item.quantity,
    name: item.name,
    priceEach: item.priceEach
  }))
  
  const totalValue = items.reduce((sum, item) => sum + (item.priceEach * item.quantity), 0)
  
  return {
    eventType: UnifiedEventType.LOOT,
    playerName: event.playerName,
    osrsAccountId,
    timestamp,
    source: UnifiedEventSource.DINK,
    data: {
      items: unifiedItems,
      source,
      totalValue
    }
  }
}

/**
 * Converts a pet event to unified format.
 * 
 * Extracts pet name and milestone information from the Dink pet event.
 */
const adaptPetEvent = (event: DinkPetEvent, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent => ({
  eventType: UnifiedEventType.PET,
  playerName: event.playerName,
  osrsAccountId,
  timestamp,
  source: UnifiedEventSource.DINK,
  data: {
    petName: event.extra.petName,
    milestone: event.extra.milestone
  }
})

/**
 * Converts a speedrun event to unified format.
 * 
 * Parses the time string (format: "HH:MM:SS", "MM:SS", or "SS") to seconds
 * and uses questName as the location identifier.
 */
const adaptSpeedrunEvent = (event: DinkSpeedrunEvent, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent => {
  const { questName, currentTime, personalBest, isPersonalBest } = event.extra
  const timeSeconds = parseTimeStringToSeconds(currentTime || personalBest)
  
  return {
    eventType: UnifiedEventType.SPEEDRUN,
    playerName: event.playerName,
    osrsAccountId,
    timestamp,
    source: UnifiedEventSource.DINK,
    data: {
      location: questName,
      timeSeconds,
      isPersonalBest: isPersonalBest ?? false
    }
  }
}

/**
 * Converts a Barbarian Assault gamble event to unified format.
 * 
 * Extracts the gamble count from the event's extra data.
 */
const adaptBaGambleEvent = (event: DinkBarbarianAssaultGambleEvent, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent => ({
  eventType: UnifiedEventType.BA_GAMBLE,
  playerName: event.playerName,
  osrsAccountId,
  timestamp,
  source: UnifiedEventSource.DINK,
  data: {
    gambleCount: event.extra.gambleCount
  }
})

/**
 * Converts a logout event to unified format.
 * 
 * Creates a minimal logout event - XP data will be fetched from WiseOldMan API
 * when processing experience-based tile requirements.
 */
const adaptLogoutEvent = (event: DinkLogoutEvent, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent => ({
  eventType: UnifiedEventType.LOGOUT,
  playerName: event.playerName,
  osrsAccountId,
  timestamp,
  source: UnifiedEventSource.DINK,
  data: {}
})

/**
 * Converts a kill count event to speedrun format (if it has time data).
 * 
 * Some boss speedrun times come through as KILL_COUNT events with a time field
 * in ISO 8601 duration format (e.g., "PT1M25S"). Returns null if no time is present.
 */
const adaptKillCountAsSpeedrun = (event: DinkKillCountEvent, osrsAccountId: number | undefined, timestamp: Date): UnifiedGameEvent | null => {
  const { time, boss, isPersonalBest } = event.extra
  
  // Only convert to speedrun if time data is present
  if (!time) {
    return null
  }
  
  const timeSeconds = parseIso8601DurationToSeconds(time)
  
  return {
    eventType: UnifiedEventType.SPEEDRUN,
    playerName: event.playerName,
    osrsAccountId,
    timestamp,
    source: UnifiedEventSource.DINK,
    data: {
      location: boss,
      timeSeconds,
      isPersonalBest
    }
  }
}

/**
 * Parses a time string to total seconds.
 * 
 * Supports formats:
 * - "1:23:45" → 5025 seconds (hours:minutes:seconds)
 * - "23:45" → 1425 seconds (minutes:seconds)
 * - "45" → 45 seconds
 */
const parseTimeStringToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number)
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0] || 0
}

/**
 * Parses ISO 8601 duration format to total seconds.
 * 
 * Supports format: PT[hours]H[minutes]M[seconds]S
 * Examples:
 * - "PT1M25S" → 85 seconds
 * - "PT1H2M3S" → 3723 seconds
 * - "PT45S" → 45 seconds
 */
const parseIso8601DurationToSeconds = (duration: string): number => {
  const timeStr = duration.replace(/^PT/i, '')
  
  const hours = timeStr.match(/(\d+)H/i)?.[1]
  const minutes = timeStr.match(/(\d+)M/i)?.[1]
  const seconds = timeStr.match(/(\d+(?:\.\d+)?)S/i)?.[1]
  
  return (
    (hours ? parseInt(hours, 10) * 3600 : 0) +
    (minutes ? parseInt(minutes, 10) * 60 : 0) +
    (seconds ? parseFloat(seconds) : 0)
  )
}


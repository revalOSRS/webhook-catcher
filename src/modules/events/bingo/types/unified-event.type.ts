/**
 * Unified Game Event Types
 * 
 * Abstract interface for game events from different sources (Dink, RuneLite, etc.)
 * Allows switching event sources without changing core logic
 */

export enum UnifiedEventType {
  LOOT = 'LOOT',
  PET = 'PET',
  SPEEDRUN = 'SPEEDRUN',
  BA_GAMBLE = 'BA_GAMBLE',
  LOGOUT = 'LOGOUT',
  EXPERIENCE = 'EXPERIENCE'
}

export enum UnifiedEventSource {
  DINK = 'dink',
  RUNELITE = 'runelite',
  PLUGIN = 'plugin'
}

export interface UnifiedGameEvent {
  eventType: UnifiedEventType
  playerName: string
  osrsAccountId?: number // May not always be available
  timestamp: Date
  source: UnifiedEventSource // Event source identifier
  
  // Event-specific data
  data: LootEventData | PetEventData | SpeedrunEventData | BaGambleEventData | LogoutEventData | ExperienceEventData
}

export interface LootEventData {
  items: Array<{
    id: number
    quantity: number
    name: string
    priceEach: number
  }>
  source?: string
  totalValue?: number
}

export interface PetEventData {
  petName: string
  milestone?: string
}

export interface SpeedrunEventData {
  location: string // e.g., "Inferno", "Zulrah"
  timeSeconds: number
  isPersonalBest?: boolean
}

export interface BaGambleEventData {
  gambleCount: number
}

export interface LogoutEventData {
  // XP data will be fetched from WiseOldMan API
  // This event triggers XP calculation
}

export interface ExperienceEventData {
  skill: string
  experience: number
  level?: number
}


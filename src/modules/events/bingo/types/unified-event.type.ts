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
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPERIENCE = 'EXPERIENCE',
  CHAT = 'CHAT'
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
  data: LootEventData | PetEventData | SpeedrunEventData | BaGambleEventData | LoginEventData | LogoutEventData | ExperienceEventData | ChatEventData
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

export interface LoginEventData {
  // LOGIN events carry current XP data from Dink
  // The XP snapshot is captured separately in dink.service.ts
  // This event triggers XP progress calculation
}

export interface LogoutEventData {
  // Legacy: LOGOUT was used to trigger XP calculation
  // Now LOGIN is preferred as it carries fresh XP data
}

export interface ExperienceEventData {
  skill: string
  experience: number
  level?: number
}

export interface ChatEventData {
  /** The chat message content */
  message: string
  /** The type of chat message (e.g., GAMEMESSAGE, BROADCAST, PUBLICCHAT) */
  messageType: string
  /** The source/sender of the message (for player messages) */
  source?: string
  /** Clan title info (for clan chat messages) */
  clanTitle?: {
    rankId: number
    title: string
  }
}


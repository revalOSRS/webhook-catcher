/**
 * RuneLite Plugin - SYNC Event Types
 * 
 * Represents comprehensive player data synchronized from RuneLite plugin
 */

import { RuneLiteBaseEvent } from './base-event.type.js'
import { RuneLiteEventType } from './event.enum.js'


// ===== Player Information =====

export interface PlayerInfo {
  username: string
  accountHash?: string
  accountType: 'NORMAL' | 'IRONMAN' | 'HARDCORE_IRONMAN' | 'ULTIMATE_IRONMAN' | 'GROUP_IRONMAN' | 'HARDCORE_GROUP_IRONMAN' | 'UNRANKED_GROUP_IRONMAN'
  world?: number
  combatLevel?: number
  totalLevel?: number
  totalXp?: number
}

// ===== Quests =====

export interface QuestData {
  name: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  completedTimestamp?: number // Unix timestamp when completed (if known)
}

export interface QuestsData {
  quests: QuestData[]
  questPoints: number
  totalQuests: number
  completedQuests: number
}

// ===== Achievement Diaries =====

export type DiaryArea = 
  | 'Ardougne'
  | 'Desert'
  | 'Falador'
  | 'Fremennik'
  | 'Kandarin'
  | 'Karamja'
  | 'Kourend'
  | 'Lumbridge'
  | 'Morytania'
  | 'Varrock'
  | 'Western'
  | 'Wilderness'

export interface DiaryProgress {
  easy: boolean
  medium: boolean
  hard: boolean
  elite: boolean
}

export interface AchievementDiariesData {
  totalDiaries: number
  totalCompleted: number
  progress: Record<string, DiaryProgress>
}

// ===== Combat Achievements =====

export type CombatAchievementTier = 'Easy' | 'Medium' | 'Hard' | 'Elite' | 'Master' | 'Grandmaster'
export type CombatAchievementType = 'Kill Count' | 'Mechanical' | 'Restriction' | 'Perfection' | 'Speed' | 'Stamina'

export interface CombatAchievementTask {
  id: number
  name: string
  description: string
  tier: CombatAchievementTier
  type: CombatAchievementType
  boss: string
  points: number
  completed: boolean
}

export interface TierProgress {
  total: number
  completed: number
}

export interface CombatAchievementsData {
  currentTier: string
  totalPoints: number
  tierProgress: {
    easy: TierProgress
    medium: TierProgress
    hard: TierProgress
    elite: TierProgress
    master: TierProgress
    grandmaster: TierProgress
  }
  allTasks: CombatAchievementTask[]
  dataSource: string
  totalTasksLoaded: number
}

// ===== Collection Log =====

export interface CollectionLogItem {
  quantity: number
  name: string
  id: number
  obtained: boolean
}

export interface CollectionLogEntry {
  total: number
  kc: number
  obtained: number
  items: CollectionLogItem[]
}

export interface CollectionLogCategory {
  [entryName: string]: CollectionLogEntry
}

export interface CollectionLogData {
  obtainedItems: number
  note: string
  totalItems: number
  categories: {
    [categoryName: string]: CollectionLogCategory
  }
}

// ===== SYNC Event Payload =====

export interface SyncEventPayload extends RuneLiteBaseEvent {
  eventType: RuneLiteEventType.SYNC
  player: PlayerInfo
  quests: QuestsData
  achievementDiaries: AchievementDiariesData
  combatAchievements: CombatAchievementsData
  collectionLog: CollectionLogData
}

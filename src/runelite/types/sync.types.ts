/**
 * RuneLite Plugin - SYNC Event Types
 * 
 * Represents comprehensive player data synchronized from RuneLite plugin
 */

// Base event structure
export interface RuneLiteBaseEvent {
  eventType: string
  eventTimestamp: number
}

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

export type DiaryTier = 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE'
export type DiaryName = 
  | 'Ardougne'
  | 'Desert'
  | 'Falador'
  | 'Fremennik'
  | 'Kandarin'
  | 'Karamja'
  | 'Kourend & Kebos'
  | 'Lumbridge & Draynor'
  | 'Morytania'
  | 'Varrock'
  | 'Western Provinces'
  | 'Wilderness'

export interface DiaryTask {
  name: string
  completed: boolean
  completedTimestamp?: number
}

export interface DiaryTierData {
  tier: DiaryTier
  tasks: DiaryTask[]
  totalTasks: number
  completedTasks: number
  isComplete: boolean
  completedTimestamp?: number
}

export interface DiaryData {
  area: DiaryName
  tiers: DiaryTierData[]
}

export interface AchievementDiariesData {
  diaries: DiaryData[]
  summary: {
    easy: { completed: number; total: number }
    medium: { completed: number; total: number }
    hard: { completed: number; total: number }
    elite: { completed: number; total: number }
    totalCompleted: number
    totalDiaries: number
  }
}

// ===== Combat Achievements =====

export type CombatAchievementTier = 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE' | 'MASTER' | 'GRANDMASTER'

export interface CombatAchievementTask {
  name: string
  tier: CombatAchievementTier
  monster?: string
  completed: boolean
  completedTimestamp?: number
}

export interface CombatAchievementsByTier {
  tier: CombatAchievementTier
  tasks: CombatAchievementTask[]
  totalTasks: number
  completedTasks: number
}

export interface CombatAchievementsData {
  tasks: CombatAchievementTask[]
  byTier: CombatAchievementsByTier[]
  summary: {
    easy: { completed: number; total: number }
    medium: { completed: number; total: number }
    hard: { completed: number; total: number }
    elite: { completed: number; total: number }
    master: { completed: number; total: number }
    grandmaster: { completed: number; total: number }
    totalCompleted: number
    totalTasks: number
  }
  points: number
}

// ===== Collection Log =====

export interface CollectionLogItem {
  id: number
  name: string
  quantity: number
  obtained: boolean
  obtainedTimestamp?: number
}

export interface CollectionLogTab {
  name: string
  entries: CollectionLogEntry[]
}

export interface CollectionLogEntry {
  name: string
  items: CollectionLogItem[]
  killCount?: number
  obtainedCount: number
  totalItems: number
}

export interface CollectionLogData {
  tabs: CollectionLogTab[]
  summary: {
    uniqueObtained: number
    uniqueTotal: number
    completionPercentage: number
  }
}

// ===== SYNC Event Payload =====

export interface SyncEventPayload extends RuneLiteBaseEvent {
  eventType: 'SYNC'
  player: PlayerInfo
  quests: QuestsData
  achievementDiaries: AchievementDiariesData
  combatAchievements: CombatAchievementsData
  collectionLog: CollectionLogData
}

// ===== Helper Types =====

export interface SyncSummary {
  player: string
  accountHash?: string
  questPoints: number
  diariesCompleted: number
  combatAchievementsCompleted: number
  collectionLogItems: number
  syncedAt: Date
}


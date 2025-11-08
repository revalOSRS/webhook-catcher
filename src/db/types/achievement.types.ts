/**
 * Achievement System Type Definitions
 * 
 * Covers: Achievement Diaries, Quests, Combat Achievements, Collection Log
 */

// ===== Achievement Diaries =====

export type DiaryTier = 'easy' | 'medium' | 'hard' | 'elite'

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

export interface AchievementDiaryTier {
  id: number
  diary_name: DiaryName
  tier: DiaryTier
  total_tasks: number
  created_at: Date
}

export interface OsrsAccountDiaryCompletion {
  id: number
  osrs_account_id: number
  diary_tier_id: number
  completed_at: Date
}

// ===== Quests =====

export type QuestDifficulty = 
  | 'novice'
  | 'intermediate'
  | 'experienced'
  | 'master'
  | 'grandmaster'

export interface QuestCompletion {
  id: number
  osrs_account_id: number
  quest_name: string
  quest_points: number
  difficulty: QuestDifficulty
  completed_at: Date
}

// ===== Combat Achievements =====

export type CombatAchievementTier = 
  | 'easy'
  | 'medium'
  | 'hard'
  | 'elite'
  | 'master'
  | 'grandmaster'

export type CombatAchievementType = 
  | 'speed'
  | 'restriction'
  | 'stamina'
  | 'mechanical'

export interface CombatAchievement {
  id: number
  name: string
  tier: CombatAchievementTier
  type: CombatAchievementType
  monster: string
  description: string
  created_at: Date
}

export interface OsrsAccountCombatAchievement {
  id: number
  osrs_account_id: number
  combat_achievement_id: number
  completed_at: Date
}

// ===== Collection Log =====

export type CollectionLogCategory = 
  | 'Bosses'
  | 'Raids'
  | 'Clues'
  | 'Minigames'
  | 'Other'

export type CollectionLogRarity = 
  | 'common'
  | 'rare'
  | 'very_rare'
  | 'pet'

export interface CollectionLogItem {
  id: number
  item_name: string
  category: CollectionLogCategory
  subcategory: string
  rarity: CollectionLogRarity
  rarity_score?: number
  wiki_url: string | null
  created_at: Date
}

export interface OsrsAccountCollectionLog {
  id: number
  osrs_account_id: number
  collection_log_item_id: number
  quantity: number
  obtained_at: Date
  updated_at: Date
}

export interface OsrsAccountCollectionLogDrop {
  id: number
  osrs_account_id: number
  collection_log_item_id: number
  source_activity: string
  killcount_at_drop: number
  is_duplicate?: boolean
  dropped_at: Date
  event_data: Record<string, any> // JSONB
}

export interface OsrsAccountKillcount {
  id: number
  osrs_account_id: number
  activity_name: string
  killcount: number
  last_updated: Date
}

// ===== Extended OSRS Account (with achievement counters) =====

export interface OsrsAccountAchievementStats {
  // Achievement Diaries
  diary_easy_count: number
  diary_medium_count: number
  diary_hard_count: number
  diary_elite_count: number
  diary_total_count: number

  // Quests
  quest_points: number
  quests_last_updated: Date | null

  // Combat Achievements
  ca_easy_count: number
  ca_medium_count: number
  ca_hard_count: number
  ca_elite_count: number
  ca_master_count: number
  ca_grandmaster_count: number
  ca_total_count: number

  // Collection Log
  clog_items_obtained: number
  clog_total_items: number
  clog_completion_percentage: number
}

// ===== Boss Personal Bests (optional addition) =====

export interface OsrsAccountPersonalBest {
  id: number
  osrs_account_id: number
  boss_name: string
  time_seconds: number
  achieved_at: Date
}

// ===== Level Milestones (optional addition) =====

export type OsrsSkill = 
  | 'attack' | 'strength' | 'defence' | 'hitpoints' | 'ranged' | 'prayer' | 'magic'
  | 'cooking' | 'woodcutting' | 'fletching' | 'fishing' | 'firemaking' | 'crafting'
  | 'smithing' | 'mining' | 'herblore' | 'agility' | 'thieving' | 'slayer'
  | 'farming' | 'runecraft' | 'hunter' | 'construction'

export interface OsrsAccountLevelUp {
  id: number
  osrs_account_id: number
  skill: OsrsSkill
  level: number
  achieved_at: Date
}


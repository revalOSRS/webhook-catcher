/**
 * Event System Type Definitions
 * 
 * Covers: Events, Daily Stats, Activity Tracking
 */

// ===== Event Types =====

export type EventType = 
  | 'quest_completion'
  | 'diary_completion'
  | 'combat_achievement'
  | 'collection_log_item'
  | 'boss_kill'
  | 'npc_kill'
  | 'significant_drop'
  | 'speedrun'
  | 'level_up'
  | 'pet_drop'
  | 'personal_best'
  | 'skill_milestone'
  | 'rare_drop'
  | 'achievement_unlock'

// ===== Main Events Table =====

export interface OsrsAccountEvent {
  id: number
  osrs_account_id: number
  event_type: EventType
  event_name: string
  event_data: Record<string, any> // JSONB - flexible event-specific data
  points_awarded: number
  created_at: Date
}

// ===== Event Data Structures (for type safety in JSONB) =====

export interface QuestCompletionEventData {
  quest_name: string
  quest_points: number
  difficulty: 'novice' | 'intermediate' | 'experienced' | 'master' | 'grandmaster'
}

export interface DiaryCompletionEventData {
  diary_name: string
  tier: 'easy' | 'medium' | 'hard' | 'elite'
  area: string
}

export interface CombatAchievementEventData {
  task: string
  tier: 'easy' | 'medium' | 'hard' | 'elite' | 'master' | 'grandmaster'
  monster: string
}

export interface CollectionLogEventData {
  item: string
  item_id: number
  category: string
  subcategory: string
  killcount?: number
  rarity: 'common' | 'rare' | 'very_rare' | 'pet'
  first_time: boolean
  price?: number
}

export interface BossKillEventData {
  boss: string
  killcount: number
  time_seconds?: number
  loot_value?: number
  notable_drops?: string[]
}

export interface LootDropEventData {
  item_name: string
  item_id: number
  quantity: number
  value: number
  source: string
  killcount?: number
}

export interface LevelUpEventData {
  skill: string
  level: number
  experience: number
}

export interface PetDropEventData {
  pet_name: string
  source: string
  killcount?: number
  rarity?: string
}

export interface PersonalBestEventData {
  boss: string
  time_seconds: number
  previous_best?: number
  improvement_seconds?: number
}

// ===== Daily Statistics =====

export interface OsrsAccountDailyStats {
  id: number
  osrs_account_id: number
  stat_date: Date
  npc_kills: number
  boss_kills: number
  total_drops: number
  total_xp_gained: number
  play_time_minutes: number
  events_recorded: number
  points_earned: number
  created_at: Date
  updated_at: Date
}

// ===== Extended OSRS Account (with event tracking) =====

export interface OsrsAccountEventStats {
  total_events: number
  last_event_at: Date | null
}

// ===== Helper Types for Event Creation =====

export interface CreateEventInput {
  osrs_account_id: number
  event_type: EventType
  event_name: string
  event_data?: Record<string, any>
  points_awarded?: number
}

export interface EventFilter {
  osrs_account_id?: number
  event_type?: EventType | EventType[]
  start_date?: Date
  end_date?: Date
  min_points?: number
  limit?: number
  offset?: number
}

export interface EventSummary {
  total_events: number
  total_points: number
  events_by_type: Record<EventType, number>
  recent_events: OsrsAccountEvent[]
}

// ===== Partition Information (for management scripts) =====

export interface EventPartitionInfo {
  partition_name: string
  start_date: Date
  end_date: Date
  row_count?: number
  size_bytes?: number
  size_pretty?: string
}


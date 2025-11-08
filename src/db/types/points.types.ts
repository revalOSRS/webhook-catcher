/**
 * Points System Type Definitions
 * 
 * Covers: Point Rules, Points Breakdown, Leaderboards
 */

// ===== Point Rule Types =====

export type PointRuleType = 
  | 'quest_difficulty'
  | 'diary_tier'
  | 'combat_achievement_tier'
  | 'collection_log_rarity'
  | 'boss_kc_milestone'
  | 'level_milestone'
  | 'skill_99'
  | 'skill_200m'
  | 'total_level_milestone'
  | 'pet_drop'
  | 'rare_drop'
  | 'personal_best'
  | 'speedrun'
  | 'achievement_unlock'

export interface PointRule {
  id: number
  rule_type: PointRuleType
  rule_key: string
  points: number
  description: string
  is_active: boolean
  max_per_day?: number | null
  cooldown_hours?: number
  created_at: Date
  updated_at: Date
}

// ===== Points Breakdown by Category =====

export type PointCategory = 
  | 'quests'
  | 'diaries'
  | 'combat_achievements'
  | 'collection_log'
  | 'bosses'
  | 'skills'
  | 'other'

export interface OsrsAccountPointsBreakdown {
  id: number
  osrs_account_id: number
  category: PointCategory
  points: number
  last_updated: Date
}

// ===== Points History (for tracking and audit) =====

export interface OsrsAccountPointsHistory {
  id: number
  osrs_account_id: number
  rule_id: number
  points_awarded: number
  awarded_at: Date
  event_id: number | null
}

// ===== Extended OSRS Account (with points) =====

export interface OsrsAccountPointsStats {
  total_points: number
  points_rank: number | null
  points_last_updated: Date | null
}

// ===== Leaderboard =====

export interface LeaderboardEntry {
  id: number
  osrs_nickname: string
  discord_id: string
  total_points: number
  quest_points: number
  ca_total_count: number
  diary_total_count: number
  clog_items_obtained: number
  ehp: number
  ehb: number
  member_since?: Date
  last_synced_at?: Date | null
  total_events?: number
  boss_points?: number
  clog_points?: number
  rank: number
}

// ===== Leaderboard Query Options =====

export interface LeaderboardQuery {
  limit?: number
  offset?: number
  order_by?: 'total_points' | 'quest_points' | 'ca_total_count' | 'diary_total_count' | 'clog_items_obtained' | 'ehp' | 'ehb'
  order_direction?: 'ASC' | 'DESC'
  min_points?: number
}

export interface LeaderboardByCategoryQuery {
  category: PointCategory
  limit?: number
  offset?: number
}

// ===== Points Calculation Helpers =====

export interface PointsCalculationResult {
  points: number
  rule_id: number | null
  rule_type: PointRuleType | null
  rule_key: string | null
  description: string
}

export interface BulkPointsUpdate {
  osrs_account_id: number
  category: PointCategory
  points_to_add: number
  reason: string
}

// ===== Common Point Rule Keys =====

// Quest difficulties
export type QuestDifficultyRuleKey = 'novice' | 'intermediate' | 'experienced' | 'master' | 'grandmaster'

// Diary tiers
export type DiaryTierRuleKey = 'easy' | 'medium' | 'hard' | 'elite'

// Combat achievement tiers
export type CombatAchievementTierRuleKey = 'easy' | 'medium' | 'hard' | 'elite' | 'master' | 'grandmaster'

// Collection log rarities
export type CollectionLogRarityRuleKey = 'common' | 'rare' | 'very_rare' | 'pet'

// Boss KC milestones
export type BossKCMilestoneRuleKey = '50' | '100' | '250' | '500' | '1000' | '2500' | '5000' | '10000'

// Level milestones
export type LevelMilestoneRuleKey = '50' | '75' | '99' | '200m_xp'

// Total level milestones
export type TotalLevelMilestoneRuleKey = '1000' | '1500' | '2000' | '2200' | '2277'

// ===== Default Point Values (for reference/seeding) =====

export interface DefaultPointRule {
  rule_type: PointRuleType
  rule_key: string
  points: number
  description: string
}

export const DEFAULT_POINT_RULES: DefaultPointRule[] = [
  // Quest difficulties
  { rule_type: 'quest_difficulty', rule_key: 'novice', points: 10, description: 'Completing a novice quest' },
  { rule_type: 'quest_difficulty', rule_key: 'intermediate', points: 25, description: 'Completing an intermediate quest' },
  { rule_type: 'quest_difficulty', rule_key: 'experienced', points: 50, description: 'Completing an experienced quest' },
  { rule_type: 'quest_difficulty', rule_key: 'master', points: 100, description: 'Completing a master quest' },
  { rule_type: 'quest_difficulty', rule_key: 'grandmaster', points: 200, description: 'Completing a grandmaster quest' },

  // Diary tiers
  { rule_type: 'diary_tier', rule_key: 'easy', points: 50, description: 'Completing an easy achievement diary' },
  { rule_type: 'diary_tier', rule_key: 'medium', points: 100, description: 'Completing a medium achievement diary' },
  { rule_type: 'diary_tier', rule_key: 'hard', points: 200, description: 'Completing a hard achievement diary' },
  { rule_type: 'diary_tier', rule_key: 'elite', points: 400, description: 'Completing an elite achievement diary' },

  // Combat achievement tiers
  { rule_type: 'combat_achievement_tier', rule_key: 'easy', points: 10, description: 'Completing an easy combat achievement' },
  { rule_type: 'combat_achievement_tier', rule_key: 'medium', points: 25, description: 'Completing a medium combat achievement' },
  { rule_type: 'combat_achievement_tier', rule_key: 'hard', points: 50, description: 'Completing a hard combat achievement' },
  { rule_type: 'combat_achievement_tier', rule_key: 'elite', points: 100, description: 'Completing an elite combat achievement' },
  { rule_type: 'combat_achievement_tier', rule_key: 'master', points: 200, description: 'Completing a master combat achievement' },
  { rule_type: 'combat_achievement_tier', rule_key: 'grandmaster', points: 400, description: 'Completing a grandmaster combat achievement' },

  // Collection log rarities
  { rule_type: 'collection_log_rarity', rule_key: 'common', points: 5, description: 'Obtaining a common collection log item' },
  { rule_type: 'collection_log_rarity', rule_key: 'rare', points: 25, description: 'Obtaining a rare collection log item' },
  { rule_type: 'collection_log_rarity', rule_key: 'very_rare', points: 100, description: 'Obtaining a very rare collection log item' },
  { rule_type: 'collection_log_rarity', rule_key: 'pet', points: 500, description: 'Obtaining a pet' },

  // Boss KC milestones
  { rule_type: 'boss_kc_milestone', rule_key: '50', points: 50, description: 'Reaching 50 KC on a boss' },
  { rule_type: 'boss_kc_milestone', rule_key: '100', points: 100, description: 'Reaching 100 KC on a boss' },
  { rule_type: 'boss_kc_milestone', rule_key: '250', points: 250, description: 'Reaching 250 KC on a boss' },
  { rule_type: 'boss_kc_milestone', rule_key: '500', points: 500, description: 'Reaching 500 KC on a boss' },
  { rule_type: 'boss_kc_milestone', rule_key: '1000', points: 1000, description: 'Reaching 1000 KC on a boss' },
  { rule_type: 'boss_kc_milestone', rule_key: '2500', points: 2000, description: 'Reaching 2500 KC on a boss' },
  { rule_type: 'boss_kc_milestone', rule_key: '5000', points: 3000, description: 'Reaching 5000 KC on a boss' },

  // Level milestones
  { rule_type: 'skill_99', rule_key: '99', points: 200, description: 'Reaching level 99 in a skill' },
  { rule_type: 'skill_200m', rule_key: '200m_xp', points: 1000, description: 'Reaching 200M XP in a skill' },

  // Total level milestones
  { rule_type: 'total_level_milestone', rule_key: '1500', points: 500, description: 'Reaching total level 1500' },
  { rule_type: 'total_level_milestone', rule_key: '2000', points: 1000, description: 'Reaching total level 2000' },
  { rule_type: 'total_level_milestone', rule_key: '2200', points: 2000, description: 'Reaching total level 2200' },
  { rule_type: 'total_level_milestone', rule_key: '2277', points: 5000, description: 'Maxing all skills (2277)' },
]


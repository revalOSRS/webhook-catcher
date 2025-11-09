/**
 * OSRS Account Types
 * 
 * Represents individual Old School RuneScape accounts linked to Discord members.
 * A Discord member can have multiple OSRS accounts (main, ironman, alt, etc.).
 * 
 * Data sources:
 * - Wise Old Man API (EHP/EHB rankings)
 * - RuneLite plugin (real-time achievements, collection log, quests)
 * - Dink webhook (in-game events like drops, kills, etc.)
 * 
 * Related tables:
 * - osrs_account_diary_completions
 * - osrs_account_combat_achievements
 * - osrs_account_collection_log
 * - osrs_account_events
 * - osrs_account_points_breakdown
 * - osrs_account_killcounts
 * 
 * ⚠️ DENORMALIZATION ANALYSIS:
 * This table has EXCESSIVE denormalization. Many fields can be computed from detail tables.
 * See DATABASE_TYPES_ANALYSIS.md for full analysis.
 */

/**
 * OSRS Account
 * 
 * Core OSRS account data with denormalized counters for fast leaderboard queries.
 * 
 * Relationships:
 * - Belongs to: Member (via discord_id)
 * - Has many: diary_completions, combat_achievements, collection_log, events
 * 
 * Integration points:
 * - account_hash: RuneLite plugin identification
 * - dink_hash: Dink webhook identification (legacy)
 * - wom_player_id: Wise Old Man player ID
 */
export interface OsrsAccount {
  // Core identity
  id: number
  discord_id: string                // FK to members (CASCADE DELETE)
  osrs_nickname: string             // In-game name (unique, indexed)
  
  // Integration identifiers
  account_hash: string | null       // RuneLite plugin hash (Migration 020)
  account_type: AccountType | null  // ⚠️ MISSING: Account type (NORMAL, IRONMAN, etc.)
  dink_hash: string | null          // Legacy Dink webhook hash
  wom_player_id: number | null      // Wise Old Man player ID
  wom_rank: string | null           // WOM rank in group (executive, etc.)
  
  // Wise Old Man metrics (from external API)
  ehp: number                       // Efficient Hours Played
  ehb: number                       // Efficient Hours Bossed
  
  // Account metadata
  is_primary: boolean               // Is this the primary account for this Discord user?
  last_synced_at: Date | null       // Last sync from RuneLite or WOM
  created_at: Date
  updated_at: Date
  
  // ========================================
  // DENORMALIZED COUNTERS (for fast queries)
  // ========================================
  
  // ⚠️ CRITICALLY REVIEW THESE:
  // Most tier-specific counters are RARELY used and should be removed.
  // They can be queried from detail tables when needed.
  // Only keep fields that are:
  // 1. Used in ORDER BY clauses (leaderboards)
  // 2. Returned in every API response
  // 3. Expensive to compute (requires complex JOINs)
  
  // Achievement Diary counters (Migration 014)
  // ❌ RECOMMENDATION: Remove tier-specific counts, keep only total
  diary_easy_count?: number         // ❌ Rarely queried
  diary_medium_count?: number       // ❌ Rarely queried
  diary_hard_count?: number         // ❌ Rarely queried
  diary_elite_count?: number        // ❌ Rarely queried
  diary_total_count?: number        // ✅ Used in leaderboards (keep)
  
  // Quest counters (Migration 015)
  quest_points?: number             // ✅ Used in leaderboards (keep)
  quests_completed?: string[]       // Array of quest names (PostgreSQL array type)
  quests_last_updated?: Date | null
  
  // Combat Achievement counters (Migration 016)
  // ❌ RECOMMENDATION: Remove tier-specific counts, use ca_total_count
  ca_easy_count?: number            // ❌ Rarely queried
  ca_medium_count?: number          // ❌ Rarely queried
  ca_hard_count?: number            // ❌ Rarely queried
  ca_elite_count?: number           // ❌ Rarely queried
  ca_master_count?: number          // ❌ Rarely queried
  ca_grandmaster_count?: number     // ❌ Rarely queried
  ca_total_count?: number           // ✅ Used in API responses (keep)
  ca_points?: number                // ⚠️ MISSING: In-game CA points (keep for leaderboards)
  
  // Collection Log counters (Migration 017)
  clog_items_obtained?: number      // ✅ Used in leaderboards (keep)
  clog_total_items?: number         // ✅ Needed to compute % (keep)
  clog_completion_percentage?: number // ❌ COMPUTED: (obtained/total)*100 (remove)
  
  // Event tracking (Migration 018)
  total_events?: number             // ❌ Rarely used (remove)
  last_event_at?: Date | null       // ❌ Rarely used for filtering (remove)
  
  // Points system (Migration 019)
  total_points?: number             // ✅ PRIMARY ranking field (keep)
  points_rank?: number | null       // ❌ Computed from materialized view (remove)
  points_last_updated?: Date | null
}

/**
 * Account Type Enum
 * 
 * ⚠️ MISSING FROM SCHEMA: Should be added to osrs_accounts table
 * 
 * Useful for:
 * - Ironman-only leaderboards
 * - Filtering by account type
 * - Display badges/icons
 */
export type AccountType = 
  | 'NORMAL'
  | 'IRONMAN'
  | 'HARDCORE_IRONMAN'
  | 'ULTIMATE_IRONMAN'
  | 'GROUP_IRONMAN'
  | 'HARDCORE_GROUP_IRONMAN'
  | 'UNRANKED_GROUP_IRONMAN'

/**
 * Achievement Diary Completion
 * 
 * Stores which achievement diaries a player has completed.
 * 
 * ⚠️ RECOMMENDATION: Simplify by removing FK to achievement_diary_tiers
 * Store diary_name and tier directly (static data should be in code)
 */
export interface OsrsAccountDiaryCompletion {
  id: number
  osrs_account_id: number
  // diary_tier_id: number      // ❌ Current: FK to static table
  diary_name: string             // ✅ Recommended: Store directly
  tier: 'easy' | 'medium' | 'hard' | 'elite'
  completed_at: Date
}

/**
 * Combat Achievement Completion
 * 
 * Stores which combat achievements a player has completed.
 * 
 * ⚠️ RECOMMENDATION: Simplify by removing FK to combat_achievements
 * Store achievement_name directly (static data should be in code)
 */
export interface OsrsAccountCombatAchievement {
  id: number
  osrs_account_id: number
  // combat_achievement_id: number // ❌ Current: FK to static table
  achievement_name: string          // ✅ Recommended: Store directly
  completed_at: Date
}

/**
 * Collection Log Entry
 * 
 * Stores which collection log items a player has obtained.
 * Only stores OBTAINED items (not all possible items).
 * 
 * ⚠️ RECOMMENDATION: Simplify by removing FK to collection_log_items
 * Store item details directly (static data should be in code)
 */
export interface OsrsAccountCollectionLog {
  id: number
  osrs_account_id: number
  // collection_log_item_id: number // ❌ Current: FK to static table
  item_name: string                  // ✅ Recommended: Store directly
  category: string                   // e.g., 'Bosses'
  subcategory: string                // e.g., 'God Wars Dungeon'
  quantity: number                   // Stack size if multiple obtained
  obtained_at: Date
  updated_at: Date
}

/**
 * Collection Log Drop History
 * 
 * Tracks individual drop occurrences for collection log items.
 * Useful for:
 * - Tracking duplicate drops
 * - KC at time of drop
 * - Drop rates analysis
 * 
 * This is separate from osrs_account_collection_log which only stores
 * current state (obtained vs not obtained).
 */
export interface OsrsAccountCollectionLogDrop {
  id: number
  osrs_account_id: number
  collection_log_item_id: number     // FK to collection_log_items
  source_activity: string | null     // Boss/activity name
  killcount_at_drop: number | null   // KC when item dropped
  dropped_at: Date
  event_data: any                    // JSONB - flexible event data from Dink
}

/**
 * Boss/Activity Kill Count
 * 
 * Tracks player kill counts for bosses and activities.
 * 
 * Data sources:
 * - RuneLite plugin (real-time)
 * - Wise Old Man snapshots (periodic)
 * 
 * Note: With RuneLite data, player_bosses_snapshots may be redundant
 */
export interface OsrsAccountKillCount {
  id: number
  osrs_account_id: number
  activity_name: string              // Boss or activity name
  killcount: number
  last_updated: Date
}




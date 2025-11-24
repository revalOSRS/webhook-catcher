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
export {};

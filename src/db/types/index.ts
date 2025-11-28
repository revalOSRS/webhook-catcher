/**
 * Database Types Index
 * 
 * Central export point for all database type definitions
 */

// Member types
export type {
  Member,
  MemberMovement,
  MemberProfile
} from './member.types.js'

// OSRS Account types
export type {
  OsrsAccount
} from './osrs-account.types.js'

// Donation types
export type {
  Donation,
  DonationCategory
} from './donation.types.js'

// Coffer types (clan coffer that holds donations)
export type {
  CofferMovement
} from './coffer.types.js'

// Token types (in-game tokens for each player)
export type {
  TokenMovement
} from './token.types.js'

// Snapshot types
export type {
  ClanStatisticsSnapshot,
  SnapshotFailedMember,
  PlayerSnapshot,
  PlayerSkillSnapshot,
  PlayerBossSnapshot,
  PlayerActivitySnapshot,
  PlayerComputedSnapshot
} from './snapshot.types.js'

// Achievement types
export type {
  // Achievement Diaries
  DiaryTier,
  DiaryName,
  AchievementDiaryTier,
  OsrsAccountDiaryCompletion,
  
  // Quests
  QuestDifficulty,
  QuestCompletion,
  
  // Combat Achievements
  CombatAchievementTier,
  CombatAchievementType,
  CombatAchievement,
  OsrsAccountCombatAchievement,
  
  // Collection Log
  CollectionLogCategory,
  CollectionLogRarity,
  CollectionLogItem,
  OsrsAccountCollectionLog,
  OsrsAccountCollectionLogDrop,
  OsrsAccountKillcount,
  
  // Stats
  OsrsAccountAchievementStats,
  
  // Optional additions
  OsrsAccountPersonalBest,
  OsrsSkill,
  OsrsAccountLevelUp
} from './achievement.types.js'

// Event types
export type {
  // Event Types
  EventType,
  OsrsAccountEvent,
  
  // Event Data Structures
  QuestCompletionEventData,
  DiaryCompletionEventData,
  CombatAchievementEventData,
  CollectionLogEventData,
  BossKillEventData,
  LootDropEventData,
  LevelUpEventData,
  PetDropEventData,
  PersonalBestEventData,
  
  // Daily Stats
  OsrsAccountDailyStats,
  OsrsAccountEventStats,
  
  // Helper Types
  CreateEventInput,
  EventFilter,
  EventSummary,
  EventPartitionInfo
} from './event.types.js'

// Points types
export type {
  // Point Rules
  PointRuleType,
  PointRule,
  
  // Points Breakdown
  PointCategory,
  OsrsAccountPointsBreakdown,
  OsrsAccountPointsHistory,
  OsrsAccountPointsStats,
  
  // Leaderboard
  LeaderboardEntry,
  LeaderboardQuery,
  LeaderboardByCategoryQuery,
  
  // Helper Types
  PointsCalculationResult,
  BulkPointsUpdate,
  DefaultPointRule,
  
  // Rule Keys
  QuestDifficultyRuleKey,
  DiaryTierRuleKey,
  CombatAchievementTierRuleKey,
  CollectionLogRarityRuleKey,
  BossKCMilestoneRuleKey,
  LevelMilestoneRuleKey,
  TotalLevelMilestoneRuleKey
} from './points.types.js'

// Event Filters types
export type {
  EventFilters,
  LootFilters,
  EnabledEvents
} from './event-filters.types.js'

export {
  DEFAULT_EVENT_FILTERS,
  getEventFilters
} from './event-filters.types.js'

// Battleship types
export * from './battleship.types.js'

// Bingo types
export type {
  EventType as BingoEventType,
  EventStatus,
  Event as BingoEvent,
  EventTeam,
  EventTeamMember,
  EventRegistration,
  TileDifficulty,
  BingoTile,
  BingoBoard,
  BingoBoardTile,
  CompletionType,
  BingoTileProgress,
  BuffDebuffType,
  BingoBuffDebuff,
  BingoBoardTileEffect,
  LineType,
  BingoBoardLineEffect
} from './bingo.types.js'

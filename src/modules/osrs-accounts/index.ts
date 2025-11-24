/**
 * OSRS Accounts Module
 * Central export for all OSRS account-related functionality
 */

// Types
export type * from './types/index.js'

// Entity types
export type { OsrsAccount } from './osrs-accounts.entity.js'
export type { AchievementDiaryCompletion } from './entities/achievement-diary-completions.entity.js'
export type { CombatAchievementCompletion } from './entities/combat-achievement-completions.entity.js'
export type { CollectionLogDrop } from './entities/collection-log-drops.entity.js'
export type { Killcount } from './entities/killcounts.entity.js'
export type { CollectionLog } from './entities/collection-log.entity.js'

// Service
export { OsrsAccountsService } from './osrs-accounts.service.js'

// Entities (for direct database access if needed)
export { OsrsAccountsEntity } from './osrs-accounts.entity.js'
export { AchievementDiaryCompletionsEntity } from './entities/achievement-diary-completions.entity.js'
export { CombatAchievementCompletionsEntity } from './entities/combat-achievement-completions.entity.js'
export { CollectionLogDropsEntity } from './entities/collection-log-drops.entity.js'
export { KillcountsEntity } from './entities/killcounts.entity.js'
export { CollectionLogEntity } from './entities/collection-log.entity.js'

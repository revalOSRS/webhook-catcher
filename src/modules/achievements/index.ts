/**
 * Achievements Module
 * Central export for all achievement-related functionality
 */

// Entity types (definition tables only - account completions moved to osrs-accounts module)
export type { AchievementDiaryTier } from './entities/achievement-diary-tiers.entity.js'
export type { CombatAchievement } from './entities/combat-achievements.entity.js'
export type { CollectionLogItem } from './entities/collection-log-items.entity.js'

// Service
export { AchievementsService } from './achievements.service.js'

// Entities (for direct database access if needed)
export { AchievementDiaryTiersEntity } from './entities/achievement-diary-tiers.entity.js'
export { CombatAchievementsEntity } from './entities/combat-achievements.entity.js'
export { CollectionLogItemsEntity } from './entities/collection-log-items.entity.js'

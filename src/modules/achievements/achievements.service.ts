/**
 * Achievements Service
 * Business logic for achievement tracking and completion
 */

import type { AchievementDiaryTier } from './entities/achievement-diary-tiers.entity.js'
import type { CombatAchievement } from './entities/combat-achievements.entity.js'
import type { CollectionLogItem } from './entities/collection-log-items.entity.js'

import { AchievementDiaryTiersEntity } from './entities/achievement-diary-tiers.entity.js'
import { CombatAchievementsEntity } from './entities/combat-achievements.entity.js'
import { CollectionLogItemsEntity } from './entities/collection-log-items.entity.js'

/**
 * Achievements Service Class
 * Provides business logic for achievement operations
 */
export class AchievementsService {
  private static readonly diaryTiersEntity = new AchievementDiaryTiersEntity()
  private static readonly combatAchievementsEntity = new CombatAchievementsEntity()
  private static readonly collectionItemsEntity = new CollectionLogItemsEntity()

  // Achievement Diary Operations

  /**
   * Get all diary tiers
   */
  static async getAllDiaryTiers(): Promise<AchievementDiaryTier[]> {
    return this.diaryTiersEntity.findAll({
      orderBy: 'diaryName',
      order: 'ASC'
    })
  }

  /**
   * Get diary tier by name and tier
   */
  static async getDiaryTier(diaryName: string, tier: string): Promise<AchievementDiaryTier | null> {
    return this.diaryTiersEntity.findByNameAndTier(diaryName, tier)
  }

  /**
   * Get diary tiers for a specific diary
   */
  static async getDiaryTiersByName(diaryName: string): Promise<AchievementDiaryTier[]> {
    return this.diaryTiersEntity.findByDiaryName(diaryName)
  }

  // Note: Diary completion methods moved to OsrsAccountsService

  // Combat Achievement Operations

  /**
   * Get all combat achievements
   */
  static async getAllCombatAchievements(): Promise<CombatAchievement[]> {
    return this.combatAchievementsEntity.findAll({
      orderBy: 'tier',
      order: 'ASC'
    })
  }

  /**
   * Get combat achievement by name
   */
  static async getCombatAchievementByName(name: string): Promise<CombatAchievement | null> {
    return this.combatAchievementsEntity.findByName(name)
  }

  /**
   * Get combat achievements by tier
   */
  static async getCombatAchievementsByTier(tier: string): Promise<CombatAchievement[]> {
    return this.combatAchievementsEntity.findByTier(tier)
  }

  /**
   * Get combat achievements by monster
   */
  static async getCombatAchievementsByMonster(monster: string): Promise<CombatAchievement[]> {
    return this.combatAchievementsEntity.findByMonster(monster)
  }

  // Note: Combat achievement completion methods moved to OsrsAccountsService

  // Collection Log Operations

  /**
   * Get all collection log items
   */
  static async getAllCollectionLogItems(): Promise<CollectionLogItem[]> {
    return this.collectionItemsEntity.findAll({
      orderBy: 'category',
      order: 'ASC'
    })
  }

  /**
   * Get collection log item by name
   */
  static async getCollectionLogItem(itemName: string, subcategory?: string): Promise<CollectionLogItem | null> {
    return this.collectionItemsEntity.findByName(itemName, subcategory)
  }

  /**
   * Get collection log items by category
   */
  static async getCollectionLogItemsByCategory(category: string, subcategory?: string): Promise<CollectionLogItem[]> {
    return this.collectionItemsEntity.findByCategory(category, subcategory)
  }

  // Note: Collection log methods moved to OsrsAccountsService

  // Statistics and Analytics

  // Note: Account-specific achievement methods moved to OsrsAccountsService

  /**
   * Create tables for achievements module (definition tables only)
   * Account-specific tables are created by the osrs-accounts module
   */
  static async createTables(): Promise<void> {
    await AchievementDiaryTiersEntity.createTable()
    await CombatAchievementsEntity.createTable()
    await CollectionLogItemsEntity.createTable()
  }
}

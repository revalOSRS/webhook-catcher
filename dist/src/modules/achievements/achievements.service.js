/**
 * Achievements Service
 * Business logic for achievement tracking and completion
 */
import { AchievementDiaryTiersEntity } from './entities/achievement-diary-tiers.entity.js';
import { CombatAchievementsEntity } from './entities/combat-achievements.entity.js';
import { CollectionLogItemsEntity } from './entities/collection-log-items.entity.js';
/**
 * Achievements Service Class
 * Provides business logic for achievement operations
 */
export class AchievementsService {
    static diaryTiersEntity = new AchievementDiaryTiersEntity();
    static combatAchievementsEntity = new CombatAchievementsEntity();
    static collectionItemsEntity = new CollectionLogItemsEntity();
    // Achievement Diary Operations
    /**
     * Get all diary tiers
     */
    static async getAllDiaryTiers() {
        return this.diaryTiersEntity.findAll({
            orderBy: 'diaryName',
            order: 'ASC'
        });
    }
    /**
     * Get diary tier by name and tier
     */
    static async getDiaryTier(diaryName, tier) {
        return this.diaryTiersEntity.findByNameAndTier(diaryName, tier);
    }
    /**
     * Get diary tiers for a specific diary
     */
    static async getDiaryTiersByName(diaryName) {
        return this.diaryTiersEntity.findByDiaryName(diaryName);
    }
    // Note: Diary completion methods moved to OsrsAccountsService
    // Combat Achievement Operations
    /**
     * Get all combat achievements
     */
    static async getAllCombatAchievements() {
        return this.combatAchievementsEntity.findAll({
            orderBy: 'tier',
            order: 'ASC'
        });
    }
    /**
     * Get combat achievement by name
     */
    static async getCombatAchievementByName(name) {
        return this.combatAchievementsEntity.findByName(name);
    }
    /**
     * Get combat achievements by tier
     */
    static async getCombatAchievementsByTier(tier) {
        return this.combatAchievementsEntity.findByTier(tier);
    }
    /**
     * Get combat achievements by monster
     */
    static async getCombatAchievementsByMonster(monster) {
        return this.combatAchievementsEntity.findByMonster(monster);
    }
    // Note: Combat achievement completion methods moved to OsrsAccountsService
    // Collection Log Operations
    /**
     * Get all collection log items
     */
    static async getAllCollectionLogItems() {
        return this.collectionItemsEntity.findAll({
            orderBy: 'category',
            order: 'ASC'
        });
    }
    /**
     * Get collection log item by name
     */
    static async getCollectionLogItem(itemName, subcategory) {
        return this.collectionItemsEntity.findByName(itemName, subcategory);
    }
    /**
     * Get collection log items by category
     */
    static async getCollectionLogItemsByCategory(category, subcategory) {
        return this.collectionItemsEntity.findByCategory(category, subcategory);
    }
    // Note: Collection log methods moved to OsrsAccountsService
    // Statistics and Analytics
    // Note: Account-specific achievement methods moved to OsrsAccountsService
    /**
     * Create tables for achievements module (definition tables only)
     * Account-specific tables are created by the osrs-accounts module
     */
    static async createTables() {
        await AchievementDiaryTiersEntity.createTable();
        await CombatAchievementsEntity.createTable();
        await CollectionLogItemsEntity.createTable();
    }
}
